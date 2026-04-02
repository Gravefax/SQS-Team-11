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

describe("Ranked Mode Flow Integration", () => {
  it("goes from idle to searching to matched", async () => {
    const user = userEvent.setup();
    render(<Queue ranked />);

    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));
    const ws = socketInstances[0];

    ws.onmessage?.({ data: JSON.stringify({ type: "queued" }) });
    await waitFor(() => {
      expect(screen.getByText(/gegner wird gesucht/i)).toBeInTheDocument();
    });

    ws.onmessage?.({ data: JSON.stringify({ type: "matched", match_id: "ranked-001" }) });
    await waitFor(
      () => {
        expect(mockPush).toHaveBeenCalledWith("/battle/ranked-001");
      },
      { timeout: 3000 }
    );
  });

  it("can cancel ranked queue", async () => {
    const user = userEvent.setup();
    render(<Queue ranked />);

    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));
    const ws = socketInstances[0];
    ws.onmessage?.({ data: JSON.stringify({ type: "queued" }) });

    const cancelButton = await screen.findByRole("button", { name: /abbrechen/i });
    await user.click(cancelButton);

    expect(ws.close).toHaveBeenCalled();
  });

  it("shows backend error message on close code 1006", async () => {
    const user = userEvent.setup();
    render(<Queue ranked />);

    await user.click(screen.getByRole("button", { name: /queue beitreten/i }));
    const ws = socketInstances[0];
    ws.onclose?.({ code: 1006 });

    await waitFor(() => {
      expect(screen.getByText(/verbindung zum server fehlgeschlagen/i)).toBeInTheDocument();
    });
  });
});
