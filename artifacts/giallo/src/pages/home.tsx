import { useState, useEffect } from "react";
import { useListCharacters, useListInterrogations, useCreateInterrogation, useDeleteInterrogation, useSubmitAccusation, getListInterrogationsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { FileText, Skull, Clock, ArrowRight, Trash2, AlertTriangle, Target } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  loadGameState,
  recordAccusation,
  resetGame,
  MOTIVES,
  MIN_QUESTIONS_TO_ACCUSE,
  type GameState,
} from "@/lib/game-state";

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: characters, isLoading: loadingCharacters } = useListCharacters();
  const { data: interrogations, isLoading: loadingInterrogations } = useListInterrogations();

  const createMutation = useCreateInterrogation();
  const deleteMutation = useDeleteInterrogation();
  const accuseMutation = useSubmitAccusation();

  const [gameState, setGameState] = useState<GameState>(() => loadGameState());
  const [showAccuseModal, setShowAccuseModal] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState("");
  const [selectedMotive, setSelectedMotive] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);

  useEffect(() => {
    setGameState(loadGameState());
  }, []);

  const isGameOver = gameState.status !== "playing";
  const totalQuestions = gameState.totalQuestions;
  const canAccuse = totalQuestions >= MIN_QUESTIONS_TO_ACCUSE && !isGameOver;

  const handleStartInterrogation = (characterId: string) => {
    if (isGameOver) return;
    createMutation.mutate(
      { data: { characterId } },
      {
        onSuccess: (interrogation) => {
          setLocation(`/interrogation/${interrogation.id}`);
        },
      }
    );
  };

  const handleDeleteInterrogation = (id: number) => {
    if (confirm("Sei sicuro di voler distruggere questo fascicolo?")) {
      deleteMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListInterrogationsQueryKey() });
          },
        }
      );
    }
  };

  const handleOpenAccuse = () => {
    setSelectedSuspect("");
    setSelectedMotive("");
    setConfirmStep(false);
    setShowAccuseModal(true);
  };

  const handleAccuse = () => {
    if (!selectedSuspect || !selectedMotive) return;
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }
    accuseMutation.mutate(
      { data: { suspectId: selectedSuspect, motiveId: selectedMotive } },
      {
        onSuccess: (result) => {
          const newState = recordAccusation(selectedSuspect, selectedMotive, result.correct);
          setGameState(newState);
          setShowAccuseModal(false);
          setLocation("/resolution");
        },
      }
    );
  };

  const handleNewGame = async () => {
    if (confirm("Vuoi ricominciare da capo? Tutti i progressi andranno persi.")) {
      if (interrogations && interrogations.length > 0) {
        await Promise.all(
          interrogations.map((s) =>
            fetch(`/api/interrogations/${s.id}`, { method: "DELETE" })
          )
        );
      }
      resetGame();
      setGameState(loadGameState());
      queryClient.invalidateQueries({ queryKey: getListInterrogationsQueryKey() });
    }
  };

  const suspectName = characters?.find((c) => c.id === selectedSuspect)?.name ?? "";
  const motiveName = MOTIVES.find((m) => m.id === selectedMotive)?.label ?? "";

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <header className="border-b-2 border-primary/30 pb-8 flex flex-col gap-4 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tighter text-foreground uppercase">g.IA.llo</h1>
              <p className="font-mono text-primary tracking-widest text-sm mt-2 uppercase">Dipartimento di Polizia di Milano // Sezione Omicidi // 1982</p>
            </div>
            <div className="border border-destructive/50 px-4 py-2 text-destructive font-mono uppercase text-sm font-bold flex items-center gap-2 w-fit mx-auto md:mx-0">
              <Skull className="h-4 w-4" /> Caso 001
            </div>
          </div>

          <div className="mt-6 bg-muted/30 p-6 border-l-4 border-primary">
            <h2 className="text-2xl font-serif font-bold mb-2">Vittima: Marco Ferretti</h2>
            <p className="font-mono text-muted-foreground leading-relaxed">
              Avvocato, 45 anni. Trovato morto nel suo studio alle 02:14 di questa notte. Causa del decesso: trauma cranico causato da un oggetto contundente. La cassaforte era aperta, ma mancano solo alcuni documenti. Abbiamo tre sospettati in stato di fermo.
            </p>
            <p className="font-mono font-bold text-foreground mt-4 uppercase">
              Interroga i sospettati. Quando hai le prove, accusa il colpevole.
            </p>
          </div>
        </header>

        {/* Game Over Banner */}
        {isGameOver && (
          <div className={`p-6 border-2 text-center space-y-3 ${gameState.status === "solved" ? "border-primary bg-primary/5" : "border-destructive/60 bg-destructive/5"}`}>
            <p className={`font-mono text-xs uppercase tracking-widest ${gameState.status === "solved" ? "text-primary" : "text-destructive"}`}>
              {gameState.status === "solved" ? "Caso chiuso — conclusione corretta" : "Caso archiviato — conclusione errata"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button
                onClick={() => setLocation("/resolution")}
                className="font-mono uppercase tracking-widest rounded-none border border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground"
              >
                Leggi il verdetto finale
              </Button>
              <Button
                onClick={handleNewGame}
                variant="ghost"
                className="font-mono uppercase tracking-widest rounded-none text-muted-foreground hover:text-foreground"
              >
                Nuovo caso
              </Button>
            </div>
          </div>
        )}

        {/* Progress + Accuse */}
        {!isGameOver && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-border p-4 bg-card/30">
            <div className="font-mono text-sm text-muted-foreground">
              <span className="text-foreground font-bold">{totalQuestions}</span> domande poste
              {totalQuestions < MIN_QUESTIONS_TO_ACCUSE && (
                <span className="ml-2 text-xs">
                  — ancora <span className="text-primary">{MIN_QUESTIONS_TO_ACCUSE - totalQuestions}</span> prima di poter accusare
                </span>
              )}
            </div>
            <Button
              onClick={handleOpenAccuse}
              disabled={!canAccuse}
              className="font-mono uppercase tracking-widest rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:opacity-30 disabled:cursor-not-allowed gap-2"
            >
              <Target className="h-4 w-4" /> Accusa il colpevole
            </Button>
          </div>
        )}

        {/* Suspects */}
        <section className="space-y-6">
          <h3 className="text-2xl font-serif font-bold uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Sospettati
          </h3>

          {loadingCharacters ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted/20 animate-pulse border border-border" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {characters?.map((char) => (
                <Card key={char.id} className={`bg-card border-border relative overflow-hidden group flex flex-col transition-colors ${isGameOver ? "opacity-60" : "hover:bg-muted/10"}`}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <CardTitle className="font-serif text-2xl group-hover:text-primary transition-colors">{char.name}</CardTitle>
                    </div>
                    <CardDescription className="font-mono text-primary uppercase text-xs tracking-wider">
                      Ruolo: {char.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="font-mono text-sm text-muted-foreground leading-relaxed line-clamp-4">{char.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleStartInterrogation(char.id)}
                      disabled={createMutation.isPending || isGameOver}
                      className="w-full font-mono uppercase tracking-widest bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-40"
                    >
                      {createMutation.isPending ? "Preparazione..." : isGameOver ? "Caso chiuso" : "Interroga"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Past Interrogations */}
        {!loadingInterrogations && interrogations && interrogations.length > 0 && (
          <section className="space-y-6">
            <h3 className="text-2xl font-serif font-bold uppercase tracking-widest border-b border-border pb-2 flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" /> Verbali Precedenti
            </h3>
            <div className="space-y-3">
              {interrogations.map((session) => (
                <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border bg-card/50 hover:bg-card transition-colors">
                  <div className="flex flex-col gap-1 mb-4 sm:mb-0">
                    <span className="font-serif font-bold text-lg">{session.characterName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      Verbale n. {session.id.toString().padStart(4, "0")} //{" "}
                      {format(new Date(session.startedAt), "dd MMM yyyy, HH:mm", { locale: it })}
                    </span>
                    <span className="font-mono text-xs text-primary">{session.messageCount} scambi registrati</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteInterrogation(session.id)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Distruggi verbale"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Link
                      href={`/interrogation/${session.id}`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 font-mono uppercase tracking-widest bg-secondary text-secondary-foreground hover:bg-secondary/80 gap-2"
                    >
                      Riprendi <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Accusation Modal */}
      {showAccuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg border-2 border-destructive/70 bg-background p-8 space-y-6 shadow-2xl">
            <div className="text-center space-y-1">
              <p className="font-mono text-xs text-destructive uppercase tracking-widest">Azione irreversibile</p>
              <h2 className="font-serif text-3xl font-bold uppercase">Atto di Accusa</h2>
              <p className="font-mono text-sm text-muted-foreground">Hai un solo tentativo. Scegli con cura.</p>
            </div>

            {!confirmStep ? (
              <>
                {/* Suspect selection */}
                <div className="space-y-2">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Sospettato accusato</p>
                  <div className="space-y-2">
                    {characters?.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => setSelectedSuspect(char.id)}
                        className={`w-full text-left p-3 border font-mono text-sm transition-colors ${
                          selectedSuspect === char.id
                            ? "border-destructive bg-destructive/10 text-foreground"
                            : "border-border bg-card/30 text-muted-foreground hover:border-destructive/40 hover:text-foreground"
                        }`}
                      >
                        <span className="font-bold">{char.name}</span>
                        <span className="ml-2 text-xs opacity-70">— {char.role}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motive selection */}
                <div className="space-y-2">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Movente contestato</p>
                  <div className="space-y-2">
                    {MOTIVES.map((motive) => (
                      <button
                        key={motive.id}
                        onClick={() => setSelectedMotive(motive.id)}
                        className={`w-full text-left p-3 border font-mono text-sm transition-colors ${
                          selectedMotive === motive.id
                            ? "border-destructive bg-destructive/10 text-foreground"
                            : "border-border bg-card/30 text-muted-foreground hover:border-destructive/40 hover:text-foreground"
                        }`}
                      >
                        {motive.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowAccuseModal(false)}
                    className="flex-1 font-mono uppercase tracking-widest rounded-none border border-border"
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleAccuse}
                    disabled={!selectedSuspect || !selectedMotive}
                    className="flex-1 font-mono uppercase tracking-widest rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:opacity-30"
                  >
                    Procedi
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Confirmation step */}
                <div className="border border-destructive/50 p-5 space-y-3 bg-destructive/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="font-mono text-sm text-destructive uppercase tracking-wide leading-relaxed">
                      Stai per firmare l'atto di accusa. Non potrai tornare indietro.
                    </p>
                  </div>
                  <div className="pt-2 space-y-1">
                    <p className="font-mono text-xs text-muted-foreground uppercase">Accusato</p>
                    <p className="font-serif text-xl font-bold">{suspectName}</p>
                    <p className="font-mono text-xs text-muted-foreground uppercase mt-2">Movente</p>
                    <p className="font-mono text-sm">{motiveName}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmStep(false)}
                    className="flex-1 font-mono uppercase tracking-widest rounded-none border border-border"
                  >
                    Torna indietro
                  </Button>
                  <Button
                    onClick={handleAccuse}
                    disabled={accuseMutation.isPending}
                    className="flex-1 font-mono uppercase tracking-widest rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:opacity-60"
                  >
                    {accuseMutation.isPending ? "Verifica..." : "Firma l'accusa"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
