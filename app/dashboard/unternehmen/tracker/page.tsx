'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/store/authStore';
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard';
import { useMount } from '@/lib/hooks/useMount';
import { getTracker, updateTrackerPhase } from '@/lib/api/fund24';
import { TrackerVorgang, TrackerPhase } from '@/lib/types';
import { FehlerBox } from '@/components/shared/FehlerBox';
import { LeererZustand } from '@/components/shared/LeererZustand';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

interface TrackerItem extends TrackerVorgang {
  unternehmen_name?: string;
}

const phasen: { id: TrackerPhase; label: string; color: string }[] = [
  { id: 'vorbereitung', label: 'Vorbereitung', color: 'bg-architect-surface-low/30' },
  { id: 'antrag', label: 'Antrag', color: 'bg-architect-primary/20' },
  { id: 'pruefung', label: 'Prüfung', color: 'bg-architect-primary/15' },
  { id: 'bewilligt', label: 'Bewilligt', color: 'bg-architect-tertiary/20' },
  { id: 'abgeschlossen', label: 'Fertig', color: 'bg-architect-primary/30' },
];

export default function UnternehmenTrackerPage() {
  const { token, istUnternehmen } = useAuth();
  const { loading: guardLoading } = useVerifiedGuard();
  const isMounted = useMount();
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [fehler, setFehler] = useState('');
  const [ladet, setLadet] = useState(true);
  const [optimistic, setOptimistic] = useState<{ [key: string]: TrackerPhase }>({});

  useEffect(() => {
    if (!isMounted || guardLoading || !istUnternehmen() || !token) return;

    const loadData = async () => {
      try {
        setFehler('');
        const { vorgaenge } = await getTracker();
        setItems(vorgaenge || []);
      } catch (error) {
        setFehler(error instanceof Error ? error.message : 'Fehler beim Laden des Trackers');
      } finally {
        setLadet(false);
      }
    };

    loadData();
  }, [isMounted, guardLoading, istUnternehmen, token]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    const newPhase = destination.droppableId as TrackerPhase;

    setOptimistic((prev) => ({ ...prev, [draggableId]: newPhase }));

    setItems((prev) =>
      prev.map((item) => (item.id === draggableId ? { ...item, phase: newPhase } : item))
    );

    try {
      if (!token) throw new Error('Kein Token');
      await updateTrackerPhase(draggableId, newPhase);
    } catch (error) {
      setFehler(error instanceof Error ? error.message : 'Fehler beim Aktualisieren');
      setOptimistic((prev) => {
        const copy = { ...prev };
        delete copy[draggableId];
        return copy;
      });
      if (token) {
        const { vorgaenge } = await getTracker();
        setItems(vorgaenge || []);
      }
    }
  };

  if (!isMounted || guardLoading || ladet) {
    return (
      <div className="min-h-screen bg-architect-surface font-body text-white p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">Projekttracker</h1>
          <p className="text-white/60">Verwalten Sie den Status Ihrer aktiven Projekte</p>
        </div>

        {fehler && <FehlerBox fehler={fehler} />}

        {items.length === 0 ? (
          <LeererZustand
            titel="Keine Projekte"
            beschreibung="Sie haben noch keine aktiven Projekte"
          />
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto">
              {phasen.map((phase) => {
                const phaseItems = items.filter((item: TrackerItem) => {
                  const currentPhase = optimistic[item.id] || item.phase;
                  return currentPhase === phase.id;
                });

                return (
                  <Droppable key={phase.id} droppableId={phase.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-lg p-4 min-h-[500px] transition ${
                          phase.color
                        } ${
                          snapshot.isDraggingOver
                            ? 'ring-2 ring-architect-primary'
                            : ''
                        }`}
                      >
                        <h2 className="font-display font-bold text-white mb-4 text-center">{phase.label}</h2>
                        <div className="space-y-3">
                          {phaseItems.length === 0 && (
                            <p className="text-center text-white/40 text-sm py-8">
                              Keine Einträge
                            </p>
                          )}
                          {phaseItems.map((item: TrackerItem, index: number) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`bg-architect-surface/60 rounded p-3 transition ${
                                    snapshot.isDragging
                                      ? 'shadow-lg ring-2 ring-architect-primary'
                                      : 'shadow-sm hover:bg-architect-surface/70'
                                  }`}
                                >
                                  <div className="flex gap-2">
                                    <div {...provided.dragHandleProps} className="mt-1">
                                      <GripVertical className="w-4 h-4 text-white/40" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white truncate">
                                        {item.programmName || 'Projekt'}
                                      </p>
                                      <p className="text-xs text-white/60 mt-1">
                                        {item.phase}
                                      </p>
                                      <Badge className="mt-2 text-xs" variant="secondary">
                                        {item.unternehmen_name || 'Unbekannt'}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
