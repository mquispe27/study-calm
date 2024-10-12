import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Commenting, Friending, Grouping, Matching, Posting, Scheduling, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Synchronize the concepts from `app.ts`.

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: SessionDoc, username: string, password: string) {
    Sessioning.isLoggedOut(session);
    return await Authing.create(username, password);
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }

  @Router.get("/comments")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getComments(author?: string) {
    let comments;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      comments = await Commenting.getByAuthor(id);
    } else {
      comments = await Commenting.getComments();
    }
    return Responses.comments(comments);
  }
  @Router.get("/comments/:parent")
  async getCommentsByParent(parent: string) {
    const parentOid = new ObjectId(parent);
    try {
      await Posting.assertPostExists(parentOid);
    } catch {
      await Commenting.assertCommentExists(parentOid);
    }
    return Responses.comments(await Commenting.getByParent(parentOid));
  }
  @Router.post("/comments")
  async createComment(session: SessionDoc, content: string, parent: string) {
    const user = Sessioning.getUser(session);
    const parentOid = new ObjectId(parent);
    try {
      await Posting.assertPostExists(parentOid);
    } catch {
      await Commenting.assertCommentExists(parentOid);
    }
    const created = await Commenting.create(user, content, parentOid);
    return { msg: created.msg, comment: await Responses.comment(created.comment) };
  }
  @Router.patch("/comments/:id")
  async updateComment(session: SessionDoc, id: string, content?: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Commenting.assertAuthorIsUser(oid, user);
    return await Commenting.update(oid, content);
  }
  @Router.delete("/comments/:id")
  async deleteComment(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Commenting.assertAuthorIsUser(oid, user);
    return Commenting.delete(oid);
  }

  @Router.get("/groups")
  @Router.validate(z.object({ member: z.string().optional() }))
  async getGroups(member?: string) {
    let groups;
    if (member) {
      const id = (await Authing.getUserByUsername(member))._id;
      groups = await Grouping.getByMembership(id);
    } else {
      groups = await Grouping.getCommunities();
    }
    return Responses.groups(groups);
  }

  @Router.get("/groups/:founder")
  async getGroupsByFounder(founder: string) {
    const founderOid = (await Authing.getUserByUsername(founder))._id;
    let groups = await Grouping.getByFounder(founderOid);
    return Responses.groups(groups);
  }

  @Router.post("/groups/")
  async createGroup(session: SessionDoc, name: string) {
    const user = Sessioning.getUser(session);
    const founderOid = new ObjectId(user);
    const created = await Grouping.create(name, founderOid);
    return { msg: created.msg, group: await Responses.group(created.group) };
  }

  @Router.patch("/groups/:id")
  async addContentToGroup(session: SessionDoc, id: string, contentId: ObjectId) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.addContent(user, groupOid, contentId);
  }

  @Router.patch("/groups/:id/remove")
  async removeContentFromGroup(session: SessionDoc, id: string, contentId: ObjectId) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.removeContent(user, groupOid, contentId);
  }

  @Router.patch("/groups/:id/join")
  async joinGroup(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.joinCommunity(user, groupOid);
  }

  @Router.patch("/groups/:id/leave")
  async leaveGroup(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    return await Grouping.leaveCommunity(user, groupOid);
  }

  @Router.delete("/groups/:id")
  async deleteGroup(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const groupOid = new ObjectId(id);
    await Grouping.assertUserIsFounder(user, groupOid);
    return await Grouping.deleteCommunity(user, groupOid);
  }

  @Router.get("/friends")
  async getFriends(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.idsToUsernames(await Friending.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: SessionDoc, friend: string) {
    const user = Sessioning.getUser(session);
    const friendOid = (await Authing.getUserByUsername(friend))._id;
    return await Friending.removeFriend(user, friendOid);
  }

  @Router.get("/friend/requests")
  async getRequests(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Responses.friendRequests(await Friending.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.sendRequest(user, toOid);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: SessionDoc, to: string) {
    const user = Sessioning.getUser(session);
    const toOid = (await Authing.getUserByUsername(to))._id;
    return await Friending.removeRequest(user, toOid);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.acceptRequest(fromOid, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: SessionDoc, from: string) {
    const user = Sessioning.getUser(session);
    const fromOid = (await Authing.getUserByUsername(from))._id;
    return await Friending.rejectRequest(fromOid, user);
  }

  @Router.post("/matches/request")
  async requestPartner(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Matching.addUnmatchedUser(user);
  }

  @Router.get("/matches/")
  async getMatchOrStatus(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const status = await Matching.getUserStatus(user);
    const other = await Matching.getMatch(user);
    if (status.status === "matched") {
      return { msg: "You are matched with " + (await Authing.getUserById(other)).username + "!" };
    } else {
      return { msg: "You are currently in the matching pool." };
    }
  }

  @Router.get("/matches/all")
  async getAllMatches() {
    const matches = await Matching.getAllMatches();
    return Responses.matches(matches);
  }

  @Router.get("/matches/unmatched")
  async getUnmatchedPool() {
    const pool = await Matching.getUnmatchedPool();
    return Responses.unmatchedPool(pool);
  }

  @Router.get("/matches/goal")
  async getGoals(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Matching.getUserGoals(user);
  }

  @Router.get("/matches/goal/partner")
  async getPartnerGoals(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Matching.getPartnerGoals(user);
  }

  @Router.delete("/matches/")
  async removeMatch(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    const other = await Matching.getMatch(user);
    return await Matching.removeMatch(user, other);
  }

  @Router.delete("/matches/user")
  async removeUserFromPool(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Matching.removeUnmatchedUser(user);
  }

  @Router.put("/matches/goal")
  async shareGoal(session: SessionDoc, goal: string) {
    const user = Sessioning.getUser(session);
    return await Matching.addGoal(user, goal);
  }

  @Router.patch("/matches/goal")
  async updateGoal(session: SessionDoc, oldGoal: string, newGoal: string) {
    const user = Sessioning.getUser(session);
    return await Matching.updateGoal(user, oldGoal, newGoal);
  }

  @Router.delete("/matches/goal")
  async removeGoal(session: SessionDoc, goal: string) {
    const user = Sessioning.getUser(session);
    return await Matching.removeGoal(user, goal);
  }

  @Router.get("/events")
  async getEvents() {
    const events = await Scheduling.getEvents();
    if (events) {
      return {
        events: await Promise.all(
          events.map(async (event) => {
            if (event.attendees) {
              return {
                ...event,
                attendees: await Authing.idsToUsernames(event.attendees),
              };
            } else return event;
          }),
        ),
      };
    } else return events;
  }

  @Router.get("/events/:id")
  async getEvent(id: string) {
    const event = await Scheduling.getEvent(new ObjectId(id));
    if (event?.attendees) {
      return {
        ...event,
        attendees: await Authing.idsToUsernames(event.attendees),
      };
    } else return event;
  }

  @Router.post("/events")
  async createEvent(session: SessionDoc, group: string, time: string, location: string, eventName: string) {
    const groupId = new ObjectId(group);
    const user = Sessioning.getUser(session);
    return await Scheduling.createEvent(user, eventName, groupId, new Date(time), location);
  }

  @Router.patch("/events/:id/join")
  async joinEvent(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    return await Scheduling.addAttendee(new ObjectId(id), user);
  }

  @Router.patch("/events/:id/leave")
  async leaveEvent(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const timeVote = await Scheduling.getUserTimeVote(new ObjectId(id), user);
    // clear user's votes before removing them from the event
    if (timeVote) {
      await Scheduling.unvoteOnTime(new ObjectId(id), new Date(timeVote), user);
    }
    const locationVote = await Scheduling.getUserLocationVote(new ObjectId(id), user);
    if (locationVote) {
      await Scheduling.unvoteOnLocation(new ObjectId(id), locationVote, user);
    }
    return await Scheduling.removeAttendee(new ObjectId(id), user);
  }

  @Router.delete("/events/:id")
  async deleteEvent(session: SessionDoc, id: string) {
    return await Scheduling.deleteEvent(new ObjectId(id));
  }

  @Router.patch("/events/:id/name")
  async updateEventName(session: SessionDoc, id: string, name: string) {
    return await Scheduling.updateName(new ObjectId(id), name);
  }

  @Router.post("/events/:id/time")
  async addPossibleTime(session: SessionDoc, id: string, time: string) {
    const user = Sessioning.getUser(session);
    await Scheduling.addPossibleTime(new ObjectId(id), new Date(time));
    const currentVote = await Scheduling.getUserTimeVote(new ObjectId(id), user);
    if (currentVote) {
      // Clear the user's current vote to set a new one
      await Scheduling.unvoteOnTime(new ObjectId(id), new Date(currentVote), user);
    }
    const response = await Scheduling.voteOnTime(new ObjectId(id), new Date(time), user);
    const newBestTime = await Scheduling.calculateBestTime(new ObjectId(id));
    if (newBestTime.bestTime) {
      await Scheduling.setBestTime(new ObjectId(id), new Date(newBestTime.bestTime));
      return { response, bestTime: newBestTime.bestTime };
    } else {
      return response;
    }
  }

  @Router.delete("/events/:id/time")
  async removePossibleTime(session: SessionDoc, id: string, time: string) {
    const user = Sessioning.getUser(session);
    await Scheduling.unvoteOnTime(new ObjectId(id), new Date(time), user);
    const response = await Scheduling.removePossibleTime(new ObjectId(id), new Date(time));
    const newBestTime = await Scheduling.calculateBestTime(new ObjectId(id));
    if (newBestTime.bestTime) {
      await Scheduling.setBestTime(new ObjectId(id), new Date(newBestTime.bestTime));
      return { response, bestTime: newBestTime.bestTime };
    } else {
      return response;
    }
  }

  @Router.post("/events/:id/time/vote")
  async voteTime(session: SessionDoc, id: string, time: string) {
    const user = Sessioning.getUser(session);
    const vote = await Scheduling.getUserTimeVote(new ObjectId(id), user);
    if (vote) {
      // Clear the user's current vote to set a new one
      await Scheduling.unvoteOnTime(new ObjectId(id), new Date(vote), user);
    }
    const response = await Scheduling.voteOnTime(new ObjectId(id), new Date(time), user);
    const newBestTime = await Scheduling.calculateBestTime(new ObjectId(id));
    if (newBestTime.bestTime) {
      await Scheduling.setBestTime(new ObjectId(id), new Date(newBestTime.bestTime));
      return { response, bestTime: newBestTime.bestTime };
    } else {
      return response;
    }
  }

  @Router.delete("/events/:id/time/vote")
  async unvoteTime(session: SessionDoc, id: string, time: string) {
    const user = Sessioning.getUser(session);
    const response = await Scheduling.unvoteOnTime(new ObjectId(id), new Date(time), user);
    const newBestTime = await Scheduling.calculateBestTime(new ObjectId(id));
    if (newBestTime.bestTime) {
      await Scheduling.setBestTime(new ObjectId(id), new Date(newBestTime.bestTime));
      return { response, bestTime: newBestTime.bestTime };
    } else {
      return response;
    }
  }

  @Router.post("/events/:id/location")
  async addPossibleLocation(session: SessionDoc, id: string, location: string) {
    const user = Sessioning.getUser(session);
    await Scheduling.addPossibleLocation(new ObjectId(id), location);
    const currentVote = await Scheduling.getUserLocationVote(new ObjectId(id), user);
    if (currentVote) {
      // Clear the user's current vote to set a new one
      await Scheduling.unvoteOnLocation(new ObjectId(id), currentVote, user);
    }
    const response = await Scheduling.voteOnLocation(new ObjectId(id), location, user);
    const newBestLocation = await Scheduling.calculateBestLocation(new ObjectId(id));
    if (newBestLocation.bestLocation) {
      await Scheduling.setBestLocation(new ObjectId(id), newBestLocation.bestLocation);
      return { response, bestLocation: newBestLocation.bestLocation };
    } else {
      return response;
    }
  }

  @Router.post("/events/:id/location/vote")
  async voteLocation(session: SessionDoc, id: string, location: string) {
    const user = Sessioning.getUser(session);
    const currentVote = await Scheduling.getUserLocationVote(new ObjectId(id), user);
    if (currentVote) {
      // Clear the user's current vote to set a new one
      await Scheduling.unvoteOnLocation(new ObjectId(id), currentVote, user);
    }
    const voteMessage = await Scheduling.voteOnLocation(new ObjectId(id), location, user);
    const newBestLocation = await Scheduling.calculateBestLocation(new ObjectId(id));
    if (newBestLocation.bestLocation) {
      await Scheduling.setBestLocation(new ObjectId(id), newBestLocation.bestLocation);
      return { voteMessage, bestLocation: newBestLocation.bestLocation };
    } else {
      return voteMessage;
    }
  }

  @Router.delete("/events/:id/location/vote")
  async unvoteLocation(session: SessionDoc, id: string, location: string) {
    const user = Sessioning.getUser(session);
    const unvoteMessage = await Scheduling.unvoteOnLocation(new ObjectId(id), location, user);
    const newBestLocation = await Scheduling.calculateBestLocation(new ObjectId(id));
    if (newBestLocation.bestLocation) {
      await Scheduling.setBestLocation(new ObjectId(id), newBestLocation.bestLocation);
      return { unvoteMessage, bestLocation: newBestLocation.bestLocation };
    } else {
      return unvoteMessage;
    }
  }

  @Router.delete("/events/:id/location")
  async removePossibleLocation(session: SessionDoc, id: string, location: string) {
    const user = Sessioning.getUser(session);
    await Scheduling.unvoteOnLocation(new ObjectId(id), location, user);
    const removeMessage = await Scheduling.removePossibleLocation(new ObjectId(id), location);
    const newBestLocation = await Scheduling.calculateBestLocation(new ObjectId(id));
    if (newBestLocation.bestLocation) {
      await Scheduling.setBestLocation(new ObjectId(id), newBestLocation.bestLocation);
      return { removeMessage, bestLocation: newBestLocation.bestLocation };
    } else {
      return removeMessage;
    }
  }

  @Router.get("/events/:id/votes")
  async getUserVotes(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    return {
      time: await Scheduling.getUserTimeVote(new ObjectId(id), user),
      location: await Scheduling.getUserLocationVote(new ObjectId(id), user),
    };
  }

  @Router.get("/events/:id/attendees")
  async getAttendees(id: string) {
    return await Scheduling.getAttendees(new ObjectId(id));
  }

  @Router.get("/events/:id/allVotes")
  async getAllVotes(id: string) {
    return {
      times: await Scheduling.getAllTimeVotes(new ObjectId(id)),
      locations: await Scheduling.getAllLocationVotes(new ObjectId(id)),
    };
  }
}
/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
