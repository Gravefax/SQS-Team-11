'use client';

/**
 * PickCategoryPhase Component
 *
 * Shown when it's the current player's turn to pick a quiz category.
 * Displays 3 available categories as interactive buttons.
 *
 * The picker (determined by backend) must select one category to proceed.
 * This triggers the start of 3 questions in the chosen category.
 *
 * Duration: Until player clicks a category button or 30 second timeout.
 */
interface PickCategoryPhaseProps {
  readonly categories: string[];
  readonly onCategoryPicked: (category: string) => void;
}

export function PickCategoryPhase({ categories, onCategoryPicked }: PickCategoryPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md reveal">
      {/* ── Header ── */}
      <div className="text-center">
        <div style={{ color: 'rgba(255,60,20,0.7)', fontSize: '0.65rem', letterSpacing: '0.25em', marginBottom: '6px' }}>
          DU WÄHLST
        </div>
        <div
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '2rem',
            letterSpacing: '0.1em',
            color: '#FFD0B0',
          }}
        >
          Wähle eine Kategorie
        </div>
        <div style={{ color: 'rgba(140,200,230,0.4)', fontSize: '0.75rem', marginTop: '4px' }}>
          Die Kategorie bestimmt deine 3 Fragen
        </div>
      </div>

      {/* ── Category Buttons ── */}
      <div className="flex flex-col gap-3 w-full">
        {categories.map((cat, i) => (
          <button
            key={cat}
            className="category-btn"
            style={{ animationDelay: `${i * 0.08}s` }}
            onClick={() => onCategoryPicked(cat)}
          >
            <div
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: '1.4rem',
                letterSpacing: '0.12em',
                color: '#FFCDB0',
              }}
            >
              {cat}
            </div>
            <div style={{ color: 'rgba(255,140,90,0.45)', fontSize: '0.68rem', letterSpacing: '0.1em', marginTop: '2px' }}>
              Kategorie auswählen
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * WaitingForCategoryPhase Component
 *
 * Shown when the opponent is picking a category.
 * Displays the opponent's name and a waiting indicator.
 *
 * Duration: Until opponent submits category selection (server broadcasts it).
 */
interface WaitingForCategoryPhaseProps {
  readonly pickerName: string;
}

export function WaitingForCategoryPhase({ pickerName }: WaitingForCategoryPhaseProps) {
  return (
    <div className="flex flex-col items-center gap-5 reveal">
      <div
        style={{
          fontSize: '2.8rem',
          filter: 'drop-shadow(0 0 14px rgba(255,200,0,0.3))',
          animation: 'spinSlow 3s linear infinite',
        }}
      >
        ⚔
      </div>
      <div
        style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '0.1em',
          color: 'rgba(160,215,240,0.8)',
        }}
      >
        {pickerName} wählt Kategorie
      </div>
      <div style={{ color: 'rgba(140,200,230,0.35)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
        Warte auf Auswahl...
      </div>
    </div>
  );
}
