import { useState } from 'react';
import { CheckSquare, Square, RotateCcw, Zap, CheckCircle2, Sparkles, Wifi, Settings, Users, Target } from 'lucide-react';

const SOP_SECTIONS = [
  {
    title: 'Connections & Data',
    time: 'Market open',
    icon: Wifi,
    items: [
      'Confirm charts are moving properly — no delayed-data indicators',
      'To check delayed data: disconnect all prop-firm connections and reconnect one at a time to find the one with delayed data',
      'For new clients, verify the time zone is set to EST',
    ],
  },
  {
    title: 'Algo Configuration',
    time: 'Per algo',
    icon: Settings,
    items: [
      'Ensure the correct instrument is selected for each algo',
      'Check if the contract is current or requires rollover',
      'Confirm the correct timeframe is set for each algo',
      'Make sure there are no duplicated algos running',
    ],
  },
  {
    title: 'Accounts',
    time: 'Daily',
    icon: Users,
    items: [
      'Verify all accounts are properly assigned',
      'All funded accounts should be active unless previously agreed as reserves with the client',
      'Review account balances',
    ],
  },
  {
    title: 'Payout & Evaluation Levels',
    time: 'Daily',
    icon: Target,
    items: [
      'Identify accounts at payout level (54k)',
      'Identify evaluations that have passed the challenge (53k)',
      'If an account is approaching payout (within ~$300–$500), reduce the stack to a single algo — recommend OGX on a low-risk setting',
    ],
  },
];

export function getStreak() {
  try {
    const raw = localStorage.getItem('cam-sop-streak');
    return raw ? JSON.parse(raw) : { count: 0, lastDate: '' };
  } catch { return { count: 0, lastDate: '' }; }
}

export function prevTradingDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  do { d.setDate(d.getDate() - 1); } while ([0, 6].includes(d.getDay()));
  return d.toISOString().slice(0, 10);
}

export function computeNewStreak(today, currentStreak, wasComplete, isNowComplete) {
  if (!isNowComplete || wasComplete) return currentStreak;
  const prev = prevTradingDay(today);
  const newCount = currentStreak.lastDate === prev ? currentStreak.count + 1 : 1;
  return { count: newCount, lastDate: today };
}

function updateStreak(today, wasComplete, isNowComplete) {
  if (!isNowComplete || wasComplete) return;
  const streak = getStreak();
  const next = computeNewStreak(today, streak, wasComplete, isNowComplete);
  localStorage.setItem('cam-sop-streak', JSON.stringify(next));
}

export default function DailySOP() {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `cam-sop-${today}`;
  const totalItems = SOP_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

  const [checked, setChecked] = useState(() => {
    try {
      // Prune SOP keys older than 30 days to prevent unbounded localStorage growth
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      Object.keys(localStorage).filter(k => k.startsWith('cam-sop-2') && k.slice(8) < cutoffStr).forEach(k => localStorage.removeItem(k));
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch { return {}; }
  });
  const [justCompleted, setJustCompleted] = useState(false);
  const streak = getStreak();

  function toggle(sectionIdx, itemIdx) {
    const key = `${sectionIdx}-${itemIdx}`;
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(storageKey, JSON.stringify(next));
      const doneCount = Object.values(next).filter(Boolean).length;
      const wasComplete = Object.values(prev).filter(Boolean).length === totalItems;
      const isNowComplete = doneCount === totalItems;
      updateStreak(today, wasComplete, isNowComplete);
      if (isNowComplete && !wasComplete) setJustCompleted(true);
      return next;
    });
  }

  function reset() {
    setChecked({});
    setJustCompleted(false);
    localStorage.removeItem(storageKey);
  }

  const doneItems = Object.values(checked).filter(Boolean).length;
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const isComplete = pct === 100;
  const currentStreak = (() => {
    if (streak.lastDate === today) return streak.count;
    const prev = new Date();
    do { prev.setDate(prev.getDate() - 1); } while ([0, 6].includes(prev.getDay()));
    return streak.lastDate === prev.toISOString().slice(0, 10) ? streak.count : 0;
  })();

  // Determine which section is currently active (first incomplete)
  const activeSectionIdx = SOP_SECTIONS.findIndex((s, sIdx) =>
    s.items.some((_, iIdx) => !checked[`${sIdx}-${iIdx}`])
  );

  return (
    <div className="daily-sop">
      <section className={`panel${isComplete ? ' sop-complete-panel' : ''}`}>
        <div className="panel-heading">
          <h3>Daily CAM Checklist</h3>
          <span className="badge muted">{today}</span>
          <span className="count">{doneItems}/{totalItems}</span>
          {currentStreak > 1 && (
            <span className="sop-streak-badge"><Zap size={12} />{currentStreak} day streak</span>
          )}
          <button className="ghost-button" onClick={reset} title="Reset today's checklist">
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        <div className="sop-progress-bar-wrap">
          <div
            className="sop-progress-bar"
            style={{
              width: `${pct}%`,
              background: isComplete
                ? 'var(--green)'
                : pct >= 60
                ? 'linear-gradient(90deg, var(--blue), var(--accent))'
                : 'var(--blue)',
              transition: 'width 0.3s ease, background 0.4s ease',
            }}
          />
        </div>
        <div className="sop-progress-label" style={{ color: isComplete ? 'var(--green)' : undefined }}>
          {isComplete ? 'All done — great work today!' : `${pct}% complete · ${totalItems - doneItems} remaining`}
        </div>

        {isComplete && justCompleted && (
          <div className="sop-celebrate">
            <Sparkles size={16} />
            <strong>Day complete!</strong>
            <span className="muted">All {totalItems} checklist items done.</span>
            {currentStreak > 1 && <span className="sop-streak-badge"><Zap size={12} />{currentStreak}-day streak!</span>}
          </div>
        )}

        {SOP_SECTIONS.map((section, sIdx) => {
          const sectionDone = section.items.filter((_, iIdx) => checked[`${sIdx}-${iIdx}`]).length;
          const sectionComplete = sectionDone === section.items.length;
          const isActive = sIdx === activeSectionIdx;
          return (
            <div className={`sop-section${sectionComplete ? ' sop-section-done' : isActive ? ' sop-section-active' : ''}`} key={section.title}>
              <div className="sop-section-header">
                <span className="sop-section-emoji">{sectionComplete ? <CheckCircle2 size={16} className="positive" /> : <section.icon size={16} />}</span>
                <span className="sop-section-title">{section.title}</span>
                <span className="sop-section-time muted">{section.time}</span>
                <span className={`sop-section-count${sectionComplete ? ' positive' : ' muted'}`}>
                  {sectionDone}/{section.items.length}
                </span>
                {sectionComplete && <span className="sop-section-badge">Done</span>}
              </div>
              <ul className="sop-list">
                {section.items.map((item, iIdx) => {
                  const key = `${sIdx}-${iIdx}`;
                  const done = !!checked[key];
                  return (
                    <li
                      key={iIdx}
                      className={`sop-item${done ? ' sop-done' : ''}`}
                      onClick={() => toggle(sIdx, iIdx)}
                    >
                      {done ? <CheckSquare size={15} className="positive" /> : <Square size={15} className="muted" />}
                      <span>{item}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Quick Reference</h3>
          <span className="badge muted">New CAM onboarding</span>
        </div>
        <div className="sop-ref-grid">
          <div className="sop-ref-card">
            <div className="sop-ref-title">VPS Access</div>
            <ol className="sop-ref-steps">
              <li>Find VPS credentials in client's Credentials tab</li>
              <li>RDP into VPS (Windows Remote Desktop)</li>
              <li>Open NinjaTrader — check connection status (green)</li>
              <li>Verify strategies panel — all algos active</li>
            </ol>
          </div>
          <div className="sop-ref-card">
            <div className="sop-ref-title">Add New Algo to Account</div>
            <ol className="sop-ref-steps">
              <li>Open NT Strategies panel</li>
              <li>Select account from dropdown</li>
              <li>Add strategy → choose algo (URGO / IFSP)</li>
              <li>Set quantity, confirm connection green</li>
              <li>Log in Activity tab: "Enabled [algo] on [account]"</li>
            </ol>
          </div>
          <div className="sop-ref-card">
            <div className="sop-ref-title">NT CSV Export (Daily)</div>
            <ol className="sop-ref-steps">
              <li>NT → Account Performance → Export</li>
              <li>Select date range (today only)</li>
              <li>Export: Accounts + Strategies CSV</li>
              <li>Upload both files in this app's import area</li>
            </ol>
          </div>
          <div className="sop-ref-card">
            <div className="sop-ref-title">Disconnection Protocol</div>
            <ol className="sop-ref-steps">
              <li>Check if trade is open — do NOT restart algo if position is live</li>
              <li>Wait for trade to close naturally</li>
              <li>Only then reconnect and restart strategy</li>
              <li>Log disconnection in Activity: time, account, resolution</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
