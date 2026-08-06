import { getMySitterProfile } from "@/features/sitter-register/actions";
import { getMyWrittenReviews, getReceivedReviews } from "@/features/reviews/actions";
import ReviewsClient from "@/features/reviews/components/ReviewsClient";
import { privatePage } from "@/lib/metadata";

export const metadata = privatePage("후기 관리");

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
