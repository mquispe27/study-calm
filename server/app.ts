import AuthenticatingConcept from "./concepts/authenticating";
import CommentingConcept from "./concepts/commenting";
import FriendingConcept from "./concepts/friending";
import GroupingConcept from "./concepts/grouping";
import MatchingConcept from "./concepts/matching";
import PostingConcept from "./concepts/posting";
import SchedulingConcept from "./concepts/scheduling";
import SessioningConcept from "./concepts/sessioning";

// The app is a composition of concepts instantiated here
// and synchronized together in `routes.ts`.
export const Sessioning = new SessioningConcept();
export const Authing = new AuthenticatingConcept("users");
export const Commenting = new CommentingConcept("comments");
export const Grouping = new GroupingConcept("groups");
export const Matching = new MatchingConcept("matches");
export const Posting = new PostingConcept("posts");
export const Scheduling = new SchedulingConcept("schedules");
export const Friending = new FriendingConcept("friends");
