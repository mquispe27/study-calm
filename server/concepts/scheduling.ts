import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface SchedulingDoc extends BaseDoc {
  creator: ObjectId;
  name: String;
  group: ObjectId;
  time: Date;
  location: string;
  attendees: ObjectId[];
  possibleTimes: Date[];
  possibleLocations: string[];
  votesOnTimes: { [time: string]: ObjectId[] };
  votesOnLocations: { [location: string]: ObjectId[] };
}

/**
 * concept: Scheduling [User, Time, Event]
 */
export default class SchedulingConcept {
  public readonly events: DocCollection<SchedulingDoc>;

  /**
   * Make an instance of Scheduling.
   */
  constructor(collectionName: string) {
    this.events = new DocCollection<SchedulingDoc>(collectionName);
  }

  async createEvent(creator: ObjectId, name: String, time: Date, location: string, attendees: ObjectId[]) {
    const _id = await this.events.createOne({ creator, name, time, location, attendees: [creator], possibleTimes: [time], possibleLocations: [location] });
    return { msg: "Event created successfully!", event: await this.events.readOne({ _id }) };
  }

  async deleteEvent(_id: ObjectId) {
    this.assertEventExists(_id);
    await this.events.deleteOne({ _id });
    return { msg: "Event deleted successfully!" };
  }

  async getEvents() {
    return await this.events.readMany({}, { sort: { time: 1 } });
  }

  async getEventById(_id: ObjectId) {
    this.assertEventExists(_id);
    return await this.events.readOne({ _id });
  }

  async updateName(_id: ObjectId, name: String) {
    this.assertEventExists(_id);
    await this.events.partialUpdateOne({ _id }, { name });
    return { msg: "Event name updated successfully!" };
  }

  async addAttendee(_id: ObjectId, attendee: ObjectId) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $addToSet: { attendees: attendee } });
    return { msg: "Attendee added successfully!" };
  }

  async removeAttendee(_id: ObjectId, attendee: ObjectId) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { attendees: attendee } });
    return { msg: "Attendee removed successfully!" };
  }

  async addPossibleTime(_id: ObjectId, time: Date) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $addToSet: { possibleTimes: time } });
    return { msg: "Possible time added successfully!" };
  }

  async addPossibleLocation(_id: ObjectId, location: string) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $addToSet: { possibleLocations: location } });
    return { msg: "Possible location added successfully!" };
  }

  async removePossibleTime(_id: ObjectId, time: Date) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { possibleTimes: time } });
    return { msg: "Possible time removed successfully!" };
  }

  async removePossibleLocation(_id: ObjectId, location: string) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { possibleLocations: location } });
    return { msg: "Possible location removed successfully!" };
  }

  async voteOnTime(_id: ObjectId, time: Date, user: ObjectId) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $addToSet: { [`votes.${time}`]: user } });
    return { msg: "Voted on time successfully!" };
  }

  async voteOnLocation(_id: ObjectId, location: string, user: ObjectId) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $addToSet: { [`votes.${location}`]: user } });
    return { msg: "Voted on location successfully!" };
  }

  async unvoteOnTime(_id: ObjectId, time: Date, user: ObjectId) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { [`votes.${time}`]: user } });
    return { msg: "Unvoted on time successfully!" };
  }

  async unvoteOnLocation(_id: ObjectId, location: string, user: ObjectId) {
    this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { [`votes.${location}`]: user } });
    return { msg: "Unvoted on location successfully!" };
  }

  async calculateBestTime(_id: ObjectId) {
    this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    const votes = event?.votesOnTimes;
    if (!votes) {
      return { msg: "No votes on times!" };
    }
    const bestTime = Object.keys(votes).reduce((bestTime, time) => {
      return votes[time].length > votes[bestTime].length ? time : bestTime;
    });

    return { msg: "Best time calculated successfully!", bestTime };
  }

  async calculateBestLocation(_id: ObjectId) {
    this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    const votes = event?.votesOnLocations;
    if (!votes) {
      return { msg: "No votes on locations!" };
    }
    const bestLocation = Object.keys(votes).reduce((bestLocation, location) => {
      return votes[location].length > votes[bestLocation].length ? location : bestLocation;
    });

    return { msg: "Best location calculated successfully!", bestLocation };
  }

  async setBestTime(_id: ObjectId, time: Date) {
    this.assertEventExists(_id);
    await this.events.partialUpdateOne({ _id }, { time });
    return { msg: "Best time set successfully!" };
  }

  async setBestLocation(_id: ObjectId, location: string) {
    this.assertEventExists(_id);
    await this.events.partialUpdateOne({ _id }, { location });
    return { msg: "Best location set successfully!" };
  }

  async assertEventExists(_id: ObjectId) {
    this.assertEventExists(_id);
    if (!(await this.events.readOne({ _id }))) {
      throw new NotFoundError(`Event ${_id} does not exist!`);
    }
  }
}
