import { getMySitterProfile } from "@/features/sitter-register/actions";
import { getMyWrittenReviews, getReceivedReviews } from "@/features/reviews/actions";
import ReviewsClient from "@/features/reviews/components/ReviewsClient";

export default async function ReviewsPage() {
  const sitter = await getMySitterProfile();
  const [writtenReviews, receivedReviews] = await Promise.all([
    getMyWrittenReviews(),
    sitter ? getReceivedReviews() : Promise.resolve([]),
  ]);

  return (
    <ReviewsClient
      isSitter={!!sitter}
      initialWrittenReviews={writtenReviews}
      initialReceivedReviews={receivedReviews}
    />
  );
}
