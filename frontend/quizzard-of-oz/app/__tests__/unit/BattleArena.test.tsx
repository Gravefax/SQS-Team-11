import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BattleArena from "@/app/components/BattleArena";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

type MockMessageEvent = Pick<MessageEvent, "data">;
type MockCloseEvent = Pick<CloseEvent, "code">;
type MockErrorEvent = Pick<Event, "type">;

type MockWebSocketInstance = {
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onmessage: ((event: MockMessageEvent) => void) | null;
  onclose: ((event: MockCloseEvent) => void) | null;
  onerror: ((event: MockErrorEvent) => void) | null;
};

type MockWebSocketClass = {
  new (url: string): MockWebSocketInstance;
  readonly instance: {
    current: MockWebSocketInstance | null;
  };
};

let mockWebSocket!: MockWebSocketInstance;
let mockWebSocketClass: MockWebSocketClass;

beforeEach(() => {
  mockWebSocketClass = class MWS {
    static readonly instance = { current: null as MockWebSocketInstance | null };
    send = vi.fn();
    close = vi.fn();
    onmessage: ((event: MockMessageEvent) => void) | null = null;
    onclose: ((event: MockCloseEvent) => void) | null = null;
    onerror: ((event: MockErrorEvent) => void) | null = null;
    constructor() {
      MWS.instance.current = this;
    }
  };

  (globalThis as unknown as { WebSocket: typeof WebSocket }).WebSocket =
    mockWebSocketClass as unknown as typeof WebSocket;

  mockWebSocket = undefined as unknown as MockWebSocketInstance;
  mockPush.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

const renderArena = (matchId: string) => {
  render(<BattleArena matchId={matchId} />);
  mockWebSocket = mockWebSocketClass.instance.current as MockWebSocketInstance;
};

describe("BattleArena Component Tests", () => {
  it("shows connecting state initially", () => {
    renderArena("match-123");
    expect(screen.getByText(/verbinde mit battle/i)).toBeInTheDocument();
  });

  it("shows category buttons after pick_category message", async () => {
    renderArena("match-123");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
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
    renderArena("match-123");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
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
    renderArena("match-123");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
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

  it("shows waiting for opponent state", async () => {
    renderArena("match-234");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({ type: "waiting_for_opponent" }),
    });

    await waitFor(() => {
      expect(screen.getByText(/warte auf gegner/i)).toBeInTheDocument();
    });
  });

  it("shows waiting for category state", async () => {
    renderArena("match-345");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: false,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "waiting_for_category",
        round: 1,
        your_wins: 0,
        opponent_wins: 0,
        picker_username: "Bob",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/bob wählt kategorie/i)).toBeInTheDocument();
      expect(screen.getByText(/warte auf auswahl/i)).toBeInTheDocument();
    });
  });

  it("shows chosen category state", async () => {
    renderArena("match-456");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "category_chosen",
        category: "Science",
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/kategorie/i)).toBeInTheDocument();
      expect(screen.getByText("Science")).toBeInTheDocument();
    });
  });

  it("sends category_pick when clicking a category", async () => {
    const user = userEvent.setup();
    renderArena("match-567");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "pick_category",
        categories: ["Science"],
        round: 1,
        your_wins: 0,
        opponent_wins: 0,
      }),
    });

    const categoryButton = await screen.findByRole("button", { name: /science/i });
    await user.click(categoryButton);
    expect(mockWebSocket.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "pick_category", category: "Science" })
    );
  });

  it("shows answered state after answer_result", async () => {
    renderArena("match-678");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
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

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "answer_result",
        correct: true,
        correct_answer: "Water",
        your_score_this_round: 1,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/richtig.*warte auf gegner/i)).toBeInTheDocument();
    });
  });

  it("shows round_result and next picker", async () => {
    renderArena("match-789");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "match_ready",
        your_username: "Alice",
        opponent_username: "Bob",
        you_pick_first: true,
        rounds_to_win: 3,
      }),
    });

    mockWebSocket.onmessage?.({
      data: JSON.stringify({
        type: "round_result",
        round: 1,
        outcome: "win",
        your_score: 2,
        opponent_score: 1,
        your_total_wins: 1,
        opponent_total_wins: 0,
        next_picker: "Bob",
        game_over: false,
      }),
    });

    await waitFor(() => {
      expect(screen.getByText(/runde gewonnen/i)).toBeInTheDocument();
      expect(screen.getByText(/nächste runde/i)).toBeInTheDocument();
    });
  });

  it("shows opponent disconnected state", async () => {
    renderArena("match-890");

    mockWebSocket.onmessage?.({
      data: JSON.stringify({ type: "opponent_disconnected" }),
    });

    await waitFor(() => {
      expect(screen.getByText(/gegner hat aufgegeben/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zurück zur lobby/i })).toBeInTheDocument();
    });
  });

  it("shows error state for auth close", async () => {
    renderArena("match-901");

    mockWebSocket.onclose?.({ code: 4001 });

    await waitFor(() => {
      expect(screen.getByText(/verbindungsfehler/i)).toBeInTheDocument();
      expect(screen.getByText(/login erforderlich/i)).toBeInTheDocument();
    });
  });
});
