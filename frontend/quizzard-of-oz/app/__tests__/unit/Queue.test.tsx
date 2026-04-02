import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Queue from "@/app/components/Queue";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

let socketInstances: any[] = [];

beforeEach(() => {
  socketInstances = [];
  (global.WebSocket as any) = class MockWebSocket {
    send = vi.fn();
    close = vi.fn();
    onmessage: ((event: MessageEvent) => void) | null = null;
    onclose: ((event: CloseEvent) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(_url: string) {
      socketInstances.push(this);
    }
  };
  mockPush.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Queue Component Tests", () => {
  it("renders ranked and unranked badges", () => {
    const { rerender } = render(<Queue ranked />);
    expect(screen.getByText(/ranked battle/i)).toBeInTheDocument();

    rerender(<Queue ranked={false} />);
    expect(screen.getByText(/unranked battle/i)).toBeInTheDocument();
  });

  it("shows searching state after queued message", async () => {
    const user = userEvent.setup();
    render(<Queue ranked={false} />);
    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));

    const ws = socketInstances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: "queued" }) });

    await waitFor(() => {
      expect(screen.getByText(/gegner wird gesucht/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /abbrechen/i })).toBeInTheDocument();
    });
  });

  it("navigates to battle after matched message", async () => {
    const user = userEvent.setup();
    render(<Queue ranked={false} />);
    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));

    const ws = socketInstances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: "matched", match_id: "test-123" }) });

    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/battle/test-123");
      },
      { timeout: 3000 }
    );
  });

  it("shows auth error on close code 4001", async () => {
    const user = userEvent.setup();
    render(<Queue ranked />);
    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));

    const ws = socketInstances[0];
    ws.onclose?.({ code: 4001 });

    await waitFor(() => {
      expect(screen.getByText(/login erforderlich/i)).toBeInTheDocument();
    });
  });
});
