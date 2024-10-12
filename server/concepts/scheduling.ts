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

  async createEvent(creator: ObjectId, name: String, group: ObjectId, time: Date, location: string) {
    await this.assertTimeIsValid(time);
    const _id = await this.events.createOne({
      creator,
      name,
      time,
      group,
      location,
      attendees: [creator],
      possibleTimes: [time],
      possibleLocations: [location],
      votesOnTimes: {},
      votesOnLocations: {},
    });
    return { msg: "Event created successfully!", event: await this.events.readOne({ _id }) };
  }

  async deleteEvent(_id: ObjectId) {
    await this.assertEventExists(_id);
    await this.events.deleteOne({ _id });
    return { msg: "Event deleted successfully!" };
  }

  async getEvents() {
    return await this.events.readMany({}, { sort: { time: 1 } });
  }

  async getEvent(_id: ObjectId) {
    await this.assertEventExists(_id);
    return await this.events.readOne({ _id });
  }

  async getUserTimeVote(_id: ObjectId, user: ObjectId) {
    await this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    for (const time in event?.votesOnTimes) {
      if (event.votesOnTimes[time].some((voter) => voter.toString() === user.toString())) {
        return time; // Return the time that the user voted on
      }
    }
    return null;
  }

  async getUserLocationVote(_id: ObjectId, user: ObjectId) {
    await this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    for (const location in event?.votesOnLocations) {
      if (event.votesOnLocations[location].some((voter) => voter.toString() === user.toString())) {
        return location; // Return the location that the user voted on
      }
    }
    return null;
  }

  async getAllTimeVotes(_id: ObjectId) {
    await this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    return event?.votesOnTimes;
  }

  async getAllLocationVotes(_id: ObjectId) {
    await this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    return event?.votesOnLocations;
  }

  async updateName(_id: ObjectId, name: String) {
    await this.assertEventExists(_id);
    await this.events.partialUpdateOne({ _id }, { name });
    return { msg: "Event name updated successfully!" };
  }

  async addAttendee(_id: ObjectId, attendee: ObjectId) {
    await this.assertAttendeeNotInEvent(_id, attendee);
    await this.events.collection.updateOne({ _id }, { $addToSet: { attendees: attendee } });
    return { msg: "Attendee added successfully!" };
  }

  async removeAttendee(_id: ObjectId, attendee: ObjectId) {
    await this.assertAttendeeInEvent(_id, attendee);
    await this.events.collection.updateOne({ _id }, { $pull: { attendees: attendee } });
    return { msg: "Attendee removed successfully!" };
  }

  async assertAttendeeInEvent(_id: ObjectId, attendee: ObjectId) {
    await this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    if (!event?.attendees.map((user) => user.toString()).includes(attendee.toString())) {
      throw new NotFoundError(`Attendee ${attendee} is not in event ${_id}!`);
    }
  }

  async assertAttendeeNotInEvent(_id: ObjectId, attendee: ObjectId) {
    await this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    if (event?.attendees.map((user) => user.toString()).includes(attendee.toString())) {
      throw new NotFoundError(`Attendee ${attendee} is already in event ${_id}!`);
    }
  }

  async getAttendees(_id: ObjectId) {
    await this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    return event?.attendees;
  }

  async addPossibleTime(_id: ObjectId, time: Date) {
    await this.assertTimeIsValid(time);
    await this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $addToSet: { possibleTimes: time } });
    return { msg: "Possible time added successfully!" };
  }

  async addPossibleLocation(_id: ObjectId, location: string) {
    await this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $addToSet: { possibleLocations: location } });
    return { msg: "Possible location added successfully!" };
  }

  async removePossibleTime(_id: ObjectId, time: Date) {
    await this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { possibleTimes: time } });
    return { msg: "Possible time removed successfully!" };
  }

  async removePossibleLocation(_id: ObjectId, location: string) {
    await this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { possibleLocations: location } });
    return { msg: "Possible location removed successfully!" };
  }

  async voteOnTime(_id: ObjectId, time: Date, user: ObjectId) {
    await this.assertTimeExists(_id, time);
    await this.events.collection.updateOne({ _id }, { $addToSet: { [`votesOnTimes.${time.toString()}`]: user } });
    return { msg: "Voted on time successfully!" };
  }

  async voteOnLocation(_id: ObjectId, location: string, user: ObjectId) {
    await this.assertLocationExists(_id, location);
    await this.events.collection.updateOne({ _id }, { $addToSet: { [`votesOnLocations.${location}`]: user } });
    return { msg: "Voted on location successfully!" };
  }

  async unvoteOnTime(_id: ObjectId, time: Date, user: ObjectId) {
    await this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { [`votesOnTimes.${time.toString()}`]: user } });
    return { msg: "Unvoted on time successfully!" };
  }

  async unvoteOnLocation(_id: ObjectId, location: string, user: ObjectId) {
    await this.assertEventExists(_id);
    await this.events.collection.updateOne({ _id }, { $pull: { [`votesOnLocations.${location}`]: user } });
    return { msg: "Unvoted on location successfully!" };
  }

  async calculateBestTime(_id: ObjectId) {
    await this.assertEventExists(_id);
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
    await this.assertEventExists(_id);
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
    await this.assertEventExists(_id);
    await this.events.partialUpdateOne({ _id }, { time });
    return { msg: "Best time set successfully!" };
  }

  async setBestLocation(_id: ObjectId, location: string) {
    await this.assertEventExists(_id);
    await this.events.partialUpdateOne({ _id }, { location });
    return { msg: "Best location set successfully!" };
  }

  async assertEventExists(_id: ObjectId) {
    const event = await this.events.readOne({ _id });
    if (!event) {
      throw new NotFoundError("Event does not exist!");
    }
  }

  async assertTimeExists(_id: ObjectId, time: Date) {
    this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    if (!event?.possibleTimes.map((time) => time.toString()).includes(time.toString())) {
      throw new NotFoundError(`Time ${time} does not exist in event ${_id}!`);
    }
  }

  async assertLocationExists(_id: ObjectId, location: string) {
    this.assertEventExists(_id);
    const event = await this.events.readOne({ _id });
    if (!event?.possibleLocations.includes(location)) {
      throw new NotFoundError(`Location ${location} does not exist in event ${_id}!`);
    }
  }

  async assertTimeIsValid(time: Date) {
    if (isNaN(time.getTime())) {
      throw new NotFoundError(`Time ${time} is not a valid date!`);
    }
  }
}
