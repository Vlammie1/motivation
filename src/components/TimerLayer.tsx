import { useTimer } from '../context/TimerContext';
import { FocusMode } from './FocusMode';
import { TimerBar } from './TimerBar';
import { TimerStartModal } from './TimerStartModal';
import { TimerConfirmModal } from './TimerConfirmModal';

/** Alle timer-UI hangt hier, buiten de pagina's om: de timer loopt door
 *  terwijl je door de app navigeert. */
export const TimerLayer = () => {
    const {
        timer, project, elapsedMs, modal, minimized, busy, switchedFrom,
        closeStart, startTimer, requestStop, requestSwitch,
        cancelConfirm, saveAndFinish, discardTimer, setSoundEnabled, setMinimized
    } = useTimer();

    // Een verwijderd project mag een lopende timer niet laten crashen.
    const projectName = project?.name || 'Onbekend project';
    const projectColor = project?.color || 'var(--color-primary)';
    const intent = timer?.intent || 'Geen omschrijving';

    return (
        <>
            {timer && !minimized && (
                <FocusMode
                    projectName={projectName}
                    projectColor={projectColor}
                    intent={intent}
                    elapsedMs={elapsedMs}
                    soundEnabled={timer.sound_enabled}
                    onToggleSound={setSoundEnabled}
                    onSwitchProject={requestSwitch}
                    onStop={requestStop}
                    onMinimize={() => setMinimized(true)}
                />
            )}

            {timer && minimized && (
                <TimerBar
                    projectName={projectName}
                    projectColor={projectColor}
                    intent={intent}
                    elapsedMs={elapsedMs}
                    onExpand={() => setMinimized(false)}
                    onStop={requestStop}
                />
            )}

            {modal?.type === 'start' && (
                <TimerStartModal
                    onClose={closeStart}
                    onStart={startTimer}
                    busy={busy}
                    switchedFrom={switchedFrom}
                    initialProjectId={modal.projectId}
                />
            )}

            {modal?.type === 'confirm' && timer && (
                <TimerConfirmModal
                    mode={modal.mode}
                    stale={modal.stale}
                    projectName={projectName}
                    projectColor={projectColor}
                    intent={intent}
                    elapsedMs={elapsedMs}
                    busy={busy}
                    onSave={saveAndFinish}
                    onCancel={cancelConfirm}
                    onDiscard={discardTimer}
                />
            )}
        </>
    );
};
