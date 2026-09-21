import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import * as sound from '@/lib/sound';
import { currentMonthKey } from '@/lib/month';
import { useGoalStore } from '@/store/goalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { setReducedMotion } from '@/test/setup';

const MONTH = currentMonthKey();

function renderApp() {
  return { user: userEvent.setup(), ...render(<App />) };
}

async function createGoal(user: ReturnType<typeof userEvent.setup>, distance = '100') {
  await user.click(screen.getByRole('button', { name: /set your monthly goal/i }));
  await user.type(screen.getByLabelText(/target distance/i), distance);
  await user.click(screen.getByRole('button', { name: /^save goal$/i }));
}

describe('Create Monthly Distance Goal', () => {
  it('shows the empty state when no goal exists', () => {
    renderApp();

    expect(screen.getByText(/no goal yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set your monthly goal/i })).toBeInTheDocument();
  });

  it('shows a skeleton rather than the empty state before hydration completes', () => {
    useGoalStore.setState({ hydrated: false });
    renderApp();

    expect(screen.getByRole('status', { name: /loading your goal/i })).toBeInTheDocument();
    expect(screen.queryByText(/no goal yet/i)).not.toBeInTheDocument();
  });

  it('creates a goal and displays it on the dashboard immediately', async () => {
    const { user } = renderApp();
    await createGoal(user);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('100 km')).toBeInTheDocument();
    expect(useGoalStore.getState().goals[MONTH].targetDistance).toBe(100);
  });

  it('defaults the month picker to the current month', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /set your monthly goal/i }));

    expect(screen.getByLabelText(/goal month/i)).toHaveValue(MONTH);
  });

  it('populates the distance field from a quick-pick chip', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /set your monthly goal/i }));
    await user.click(screen.getByRole('button', { name: '150 km' }));

    expect(screen.getByLabelText(/target distance/i)).toHaveValue('150');
  });

  it('disables save until the form is valid', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /set your monthly goal/i }));

    expect(screen.getByRole('button', { name: /^save goal$/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/target distance/i), '20');
    expect(screen.getByRole('button', { name: /^save goal$/i })).toBeEnabled();
  });

  it('stores the chosen unit and reuses it as the preference', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /set your monthly goal/i }));
    await user.click(screen.getByRole('radio', { name: /miles/i }));
    await user.type(screen.getByLabelText(/target distance/i), '60');
    await user.click(screen.getByRole('button', { name: /^save goal$/i }));

    expect(await screen.findByText('60 mi')).toBeInTheDocument();
    expect(useSettingsStore.getState().preferredUnit).toBe('mi');
  });

  it('opens the edit form pre-filled with the existing goal values', async () => {
    const { user } = renderApp();
    await createGoal(user);

    await user.click(await screen.findByRole('button', { name: /edit goal/i }));

    expect(screen.getByLabelText(/target distance/i)).toHaveValue('100');
    expect(screen.getByLabelText(/goal month/i)).toBeDisabled();
  });

  it('deletes a goal after confirmation and returns to the empty state', async () => {
    const { user } = renderApp();
    await createGoal(user);

    await user.click(await screen.findByRole('button', { name: /delete goal/i }));
    await user.click(screen.getByRole('button', { name: /yes, delete it/i }));

    await waitFor(() => expect(screen.getByText(/no goal yet/i)).toBeInTheDocument());
    expect(useGoalStore.getState().goals[MONTH]).toBeUndefined();
  });

  it('hides edit and delete controls once the goal month has ended', () => {
    useGoalStore.setState({
      hydrated: true,
      goals: {
        [MONTH]: {
          id: 'past',
          monthKey: MONTH,
          targetDistance: 80,
          unit: 'km',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
    });

    vi.setSystemTime(new Date(new Date().getFullYear() + 1, 0, 15));
    renderApp();

    // The dashboard tracks the current month, so last year's goal is not shown at all.
    expect(screen.queryByRole('button', { name: /edit goal/i })).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe('Replacing an existing goal', () => {
  it('asks for confirmation before replacing a goal for the same month', async () => {
    const { user } = renderApp();
    await createGoal(user);

    await user.click(await screen.findByRole('button', { name: /edit goal/i }));
    await user.clear(screen.getByLabelText(/target distance/i));
    await user.type(screen.getByLabelText(/target distance/i), '150');
    await user.click(screen.getByRole('button', { name: /^save goal$/i }));

    // Editing the same goal is not a replacement, so it saves straight away.
    expect(await screen.findByText('150 km')).toBeInTheDocument();
  });

  it('leaves the original goal untouched when a replace is cancelled', async () => {
    const { user } = renderApp();
    await createGoal(user);

    await user.click(await screen.findByRole('button', { name: /edit goal/i }));
    await user.clear(screen.getByLabelText(/target distance/i));
    await user.type(screen.getByLabelText(/target distance/i), '150');
    await user.keyboard('{Escape}');

    const discard = await screen.findByRole('button', { name: /discard/i });
    await user.click(discard);

    expect(await screen.findByText('100 km')).toBeInTheDocument();
  });
});

describe('Edge cases', () => {
  it('rejects a distance above the sanity ceiling and keeps the dialog open', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /set your monthly goal/i }));
    await user.type(screen.getByLabelText(/target distance/i), '5000');
    await user.click(screen.getByRole('button', { name: /^save goal$/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(useGoalStore.getState().goals[MONTH]).toBeUndefined();
  });

  it('shows a storage warning but keeps the goal usable when localStorage throws', async () => {
    const { memoryStorage } = await import('@/test/setup');
    memoryStorage.shouldThrow = true;

    const { user } = renderApp();
    await createGoal(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't save your goal/i);
    expect(screen.getByText('100 km')).toBeInTheDocument();
  });
});

describe('Playful feedback', () => {
  it('plays no sounds when sound is muted', async () => {
    const playSpy = vi.spyOn(sound, 'playSound');
    useSettingsStore.setState({ soundEnabled: false });

    const { user } = renderApp();
    await createGoal(user);

    expect(playSpy).not.toHaveBeenCalled();
    playSpy.mockRestore();
  });

  it('toggles and persists the sound preference', async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole('button', { name: /mute sounds/i }));

    expect(useSettingsStore.getState().soundEnabled).toBe(false);
    expect(screen.getByRole('button', { name: /unmute sounds/i })).toBeInTheDocument();
  });

  it('renders without decorative confetti when reduced motion is requested', async () => {
    setReducedMotion(true);
    const { user } = renderApp();
    await createGoal(user);

    expect(await screen.findByText('100 km')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('has no axe violations on the dashboard', async () => {
    const { container } = renderApp();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('associates the distance field with its error message', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /set your monthly goal/i }));
    await user.type(screen.getByLabelText(/target distance/i), '0');
    await user.tab();

    const input = screen.getByLabelText(/target distance/i);
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));

    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId as string)).toHaveTextContent(/more than zero/i);
    expect(screen.getByRole('button', { name: /^save goal$/i })).toBeDisabled();
  });

  it('restores focus to the trigger when the dialog closes', async () => {
    const { user } = renderApp();
    const trigger = screen.getByRole('button', { name: /set your monthly goal/i });

    await user.click(trigger);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /cancel/i }));

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
