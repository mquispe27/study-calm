import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface MatchingDoc extends BaseDoc {
  user1: ObjectId;
  user2: ObjectId;
  user1Goals: string[];
  user2Goals: string[];
}

export interface UserMatchStatusDoc extends BaseDoc {
  user: ObjectId;
  status: "matched" | "unmatched";
}

/**
 * concept: Matching [User, User]
 */
export default class MatchingConcept {
  public readonly matches: DocCollection<MatchingDoc>;
  public readonly statuses: DocCollection<UserMatchStatusDoc>;

  /**
   * Make an instance of Matching
   */
  constructor(collectionName: string) {
    this.matches = new DocCollection<MatchingDoc>(collectionName);
    this.statuses = new DocCollection<UserMatchStatusDoc>(collectionName + "_statuses");
  }

  // Add user to unmatched pool by setting status to "unmatched" and check if there is a match for the user
  async addUnmatchedUser(user: ObjectId) {
    await this.assertNotMatched(user); // Ensure user is not already matched
    await this.assertNotInPool(user); // Ensure user is not already in the pool
    await this.statuses.createOne({ user, status: "unmatched" });
    // Check if there is a match for the user
    const unmatched = await this.getUnmatchedPool();
    if (unmatched.length > 1) {
      const other = unmatched.find((u) => u.user.toString() !== user.toString())!;
      return await this.addMatch(user, other.user);
    } else {
      return { msg: "Added to unmatched pool, which is currently empty. You will be matched as soon as someone else is in the pool." };
    }
  }

  // If the user doesn't feel like it, remove themselves from the pool.
  async removeUnmatchedUser(user: ObjectId) {
    await this.assertNotMatched(user);
    await this.statuses.deleteOne({ user });
    return { msg: "Removed from unmatched pool!" };
  }

  async getUserStatus(user: ObjectId) {
    const status = await this.statuses.readOne({ user });
    if (!status) {
      throw new NotFoundError("User does not exist!");
    }
    return status;
  }

  async getUnmatchedPool() {
    return await this.statuses.readMany({ status: "unmatched" });
  }

  async removeMatch(user: ObjectId, other: ObjectId) {
    const match = await this.matches.popOne({
      $or: [
        { user1: user, user2: other },
        { user1: other, user2: user },
      ],
    });
    await this.statuses.partialUpdateOne({ user }, { status: "unmatched" });
    await this.statuses.partialUpdateOne({ user: other }, { status: "unmatched" });
    if (match === null) {
      throw new MatchNotFoundError(user, other);
    }
    return { msg: "Unmatched!" };
  }

  async getMatch(user: ObjectId) {
    this.assertMatched(user);
    const match = await this.matches.readOne({
      $or: [{ user1: user }, { user2: user }],
    });
    if (match === null) {
      throw new MatchNotFoundError(user, user);
    }
    return match.user1.toString() === user.toString() ? match.user2 : match.user1;
  }

  async getAllMatches() {
    return await this.matches.readMany({});
  }

  async getUserGoals(user: ObjectId) {
    await this.assertMatched(user);
    const match = await this.matches.readOne({
      $or: [{ user1: user }, { user2: user }],
    });
    if (match === null) {
      throw new MatchNotFoundError(user, user);
    }
    const goals = match.user1.toString() === user.toString() ? match.user1Goals : match.user2Goals;
    if (!goals || goals.length === 0) {
      return { msg: "No goals set!" };
    }
    return goals;
  }

  async getPartnerGoals(user: ObjectId) {
    await this.assertMatched(user);
    const match = await this.matches.readOne({
      $or: [{ user1: user }, { user2: user }],
    });
    if (match === null) {
      throw new MatchNotFoundError(user, user);
    }
    const goals = match.user1.toString() === user.toString() ? match.user2Goals : match.user1Goals;
    if (!goals || goals.length === 0) {
      return { msg: "No goals set!" };
    }
    return goals;
  }

  async addGoal(user: ObjectId, goal: string) {
    await this.assertMatched(user);
    const match = await this.matches.readOne({
      $or: [{ user1: user }, { user2: user }],
    });
    if (match === null) {
      throw new MatchNotFoundError(user, user);
    }
    const userGoals = match.user1.toString() === user.toString() ? "user1Goals" : "user2Goals";
    await this.matches.collection.updateOne({ _id: match._id }, { $addToSet: { [userGoals]: goal } });
    return { msg: "Goal added!" };
  }

  async updateGoal(user: ObjectId, oldGoal: string, newGoal: string) {
    await this.assertMatched(user);
    const match = await this.matches.readOne({
      $or: [{ user1: user }, { user2: user }],
    });
    if (match === null) {
      throw new MatchNotFoundError(user, user);
    }
    const userGoals = match.user1.toString() === user.toString() ? "user1Goals" : "user2Goals";
    await this.matches.collection.updateOne({ _id: match._id }, { $pull: { [userGoals]: oldGoal } });
    await this.matches.collection.updateOne({ _id: match._id }, { $addToSet: { [userGoals]: newGoal } });
    return { msg: "Goal updated!" };
  }

  async removeGoal(user: ObjectId, goal: string) {
    await this.assertMatched(user);
    const match = await this.matches.readOne({
      $or: [{ user1: user }, { user2: user }],
    });
    if (match === null) {
      throw new MatchNotFoundError(user, user);
    }
    const userGoals = match.user1.toString() === user.toString() ? "user1Goals" : "user2Goals";
    await this.matches.collection.updateOne({ _id: match._id }, { $pull: { [userGoals]: goal } });
    return { msg: "Goal removed!" };
  }

  private async assertMatched(user: ObjectId) {
    const status = await this.statuses.readOne({ user });
    if (!status) {
      throw new NotAllowedError("User does not exist!");
    } else if (status.status == "unmatched") {
      throw new NotAllowedError("User is not matched!");
    }
  }

  private async assertNotMatched(user: ObjectId) {
    const status = await this.statuses.readOne({ user });
    if (status && status.status == "matched") {
      throw new NotAllowedError("User is already matched!");
    }
  }

  private async assertNotInPool(user: ObjectId) {
    const status = await this.statuses.readOne({ user });
    if (status) {
      throw new NotAllowedError("User is already in the matching pool!");
    }
  }

  private async addMatch(user1: ObjectId, user2: ObjectId) {
    await this.statuses.partialUpdateOne({ user: user1 }, { status: "matched" });
    await this.statuses.partialUpdateOne({ user: user2 }, { status: "matched" });
    void this.matches.createOne({ user1, user2 });
    return { msg: user1 + " and " + user2 + " are now matched!" };
  }
}

export class MatchNotFoundError extends NotFoundError {
  constructor(
    public readonly user1: ObjectId,
    public readonly user2: ObjectId,
  ) {
    super("Match between {0} and {1} does not exist!", user1, user2);
  }
}

export class AlreadyMatchedError extends NotAllowedError {
  constructor(
    public readonly user1: ObjectId,
    public readonly user2: ObjectId,
  ) {
    super("{0} and {1} are already matched!", user1, user2);
  }
}
