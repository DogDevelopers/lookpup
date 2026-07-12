import ChatClient from "@/features/chat/components/ChatClient";

// TODO: wire real chat data/actions (rooms, messages, reservations, payments)
// once the chat backend is ported. This currently renders the chat design
// with local mock data only.
export default function ChatPage() {
  return <ChatClient />;
}
