import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import BattleArena from "@/app/components/BattleArena";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockWebSocket: any;

beforeEach(() => {
  (global.WebSocket as any) = class MWS {
    send = vi.fn();
    close = vi.fn();
    onmessage = null;
    onclose = null;
    onerror = null;
    constructor(url: string) {
      mockWebSocket = this;
    }
  };
  mockPush.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("BattleArena Component Tests", () => {
  it("shows connecting state initially", () => {
    render(<BattleArena matchId="match-123" />);
    expect(screen.getByText(/verbinde mit battle/i)).toBeInTheDocument();
  });

  it("shows category buttons after pick_category message", async () => {
    render(<BattleArena matchId="match-123" />);

    mockWebSocket.onmessage({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage({
      data: JSON.stringify({
        type: "pick_category",
        categories: ["Science", "History"],
        round: 1,
        your_wins: 0,
        opponent_wins: 0,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/wähle eine kategorie/i)).toBeInTheDocument();
      expect(screen.getByText("Science")).toBeInTheDocument();
    });
  });

  it("shows question with category in question phase", async () => {
    render(<BattleArena matchId="match-123" />);

    mockWebSocket.onmessage({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage({
      data: JSON.stringify({
        type: "question",
        question_number: 1,
        total_questions: 3,
        question_id: "q1",
        text: "What is H2O?",
        answers: ["Water", "Oxygen", "Hydrogen", "Salt"],
        category: "Science",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/what is h2o\?/i)).toBeInTheDocument();
      expect(screen.getByText("SCIENCE")).toBeInTheDocument();
    });
  });

  it("shows game over state", async () => {
    render(<BattleArena matchId="match-123" />);

    mockWebSocket.onmessage({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage({
      data: JSON.stringify({
        type: "game_over",
        winner: "Alice",
        you_won: true,
        your_wins: 3,
        opponent_wins: 1,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/victory/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zurück zur lobby/i })).toBeInTheDocument();
    });
  });
});
