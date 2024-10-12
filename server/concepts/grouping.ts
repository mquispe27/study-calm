import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface GroupingDoc extends BaseDoc {
  name: string;
  founder: ObjectId;
  members: ObjectId[];
  content: ObjectId[];
}

/**
 * concept: Commenting [Author, Community, Parent]
 */
export default class GroupingConcept {
  public readonly groups: DocCollection<GroupingDoc>;

  /**
   * Make an instance of Grouping
   */
  constructor(collectionName: string) {
    this.groups = new DocCollection<GroupingDoc>(collectionName);
  }

  async create(name: string, founder: ObjectId) {
    if (await this.groups.readOne({ name })) {
      throw new NotAllowedError(`Group with name ${name} already exists!`);
    }
    const _id = await this.groups.createOne({ name, founder, members: [founder], content: [] });
    return { msg: "Group successfully created!", group: await this.groups.readOne({ _id }) };
  }

  async getCommunities() {
    // Returns all communities! You might want to page for better client performance
    return await this.groups.readMany({}, { sort: { _id: -1 } });
  }

  async getByMembership(member: ObjectId) {
    return await this.groups.readMany({ members: member });
  }

  async getMembers(communityId: ObjectId) {
    return await this.groups.readOne({ _id: communityId }, { projection: { members: 1 } });
  }

  async getAllContent(communityId: ObjectId) {
    return await this.groups.readOne({ _id: communityId }, { projection: { content: 1 } });
  }

  async getByFounder(founder: ObjectId) {
    return await this.groups.readMany({ founder });
  }

  async getByName(name: string) {
    return await this.groups.readOne({ name });
  }

  async joinCommunity(user: ObjectId, communityId: ObjectId) {
    await this.assertUserIsNotInGroup(user, communityId);
    await this.groups.collection.updateOne({ _id: communityId }, { $addToSet: { members: user } });
    return { msg: "Successfully joined the community!" };
  }

  async leaveCommunity(user: ObjectId, communityId: ObjectId) {
    await this.assertUserIsNotFounder(user, communityId);
    await this.assertUserIsInGroup(user, communityId);
    await this.groups.collection.updateOne({ _id: communityId }, { $pull: { members: user } });
    return { msg: "Successfully left the community!" };
  }

  async deleteCommunity(user: ObjectId, community: ObjectId) {
    await this.assertUserIsInGroup(user, community);
    await this.assertUserIsFounder(user, community);
    await this.groups.collection.deleteOne({ _id: community });
    return { msg: "Successfully deleted the community!" };
  }

  async addContent(user: ObjectId, communityId: ObjectId, contentId: ObjectId) {
    await this.assertContentDoesNotExistInCommunity(contentId, communityId);
    await this.assertUserIsInGroup(user, communityId);
    await this.groups.collection.updateOne({ _id: communityId }, { $addToSet: { content: contentId } });
    return { msg: "Content successfully added to the community!" };
  }

  async removeContent(user: ObjectId, communityId: ObjectId, contentId: ObjectId) {
    await this.assertContentExistsInCommunity(contentId, communityId);
    await this.assertUserIsInGroup(user, communityId);
    await this.groups.collection.updateOne({ _id: communityId }, { $pull: { content: contentId } });
    return { msg: "Content successfully removed from the community!" };
  }

  async assertGroupExists(_id: ObjectId) {
    if (!(await this.groups.readOne({ _id }))) {
      throw new NotFoundError(`Group ${_id} does not exist!`);
    }
  }

  async assertUserIsFounder(user: ObjectId, _id: ObjectId) {
    const groupDoc = await this.groups.readOne({ _id });
    if (!groupDoc) {
      throw new NotFoundError("Group does not exist!");
    }
    if (user.toString() !== groupDoc.founder.toString()) {
      throw new NotAllowedError("User is not the founder of the group!");
    }
  }

  private async assertUserIsNotFounder(user: ObjectId, _id: ObjectId) {
    const groupDoc = await this.groups.readOne({ _id });
    if (!groupDoc) {
      throw new NotFoundError("Group does not exist!");
    }
    if (user.toString() === groupDoc.founder.toString()) {
      throw new NotAllowedError("Cannot leave community! User is the founder of the group!");
    }
  }

  private async assertUserIsInGroup(user: ObjectId, _id: ObjectId) {
    const groupDoc = await this.groups.readOne({ _id });
    if (!groupDoc) {
      throw new NotFoundError("Group does not exist!");
    }
    if (!groupDoc.members.map((member) => member.toString()).includes(user.toString())) {
      throw new NotFoundError("User is not in group!");
    }
  }
  private async assertUserIsNotInGroup(user: ObjectId, _id: ObjectId) {
    const groupDoc = await this.groups.readOne({ _id });
    if (!groupDoc) {
      throw new NotFoundError("Group does not exist!");
    }
    if (groupDoc.members.map((member) => member.toString()).includes(user.toString())) {
      throw new NotAllowedError("User is already in group!");
    }
  }

  private async assertContentDoesNotExistInCommunity(contentId: ObjectId, communityId: ObjectId) {
    const community = await this.groups.readOne({ _id: communityId });
    if (!community) {
      throw new NotFoundError("Community does not exist!");
    }
    if (community.content.includes(contentId)) {
      throw new NotAllowedError("Content already exists in community!");
    }
  }

  private async assertContentExistsInCommunity(contentId: ObjectId, communityId: ObjectId) {
    const community = await this.groups.readOne({ _id: communityId });
    if (!community) {
      throw new NotFoundError("Community does not exist!");
    }
    if (!community.content.includes(contentId)) {
      throw new NotFoundError("Content does not exist in community!");
    }
  }
}
