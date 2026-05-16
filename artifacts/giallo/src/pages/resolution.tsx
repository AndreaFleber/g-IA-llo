import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loadGameState, resetGame, MOTIVES } from "@/lib/game-state";
import { Button } from "@/components/ui/button";

const SUSPECT_NAMES: Record<string, string> = {
  anna: "Anna Moretti",
  luca: "Luca Bianchi",
  sara: "Sara Conti",
};

const TRUTH = `Quella notte, dopo che Sara Conti se ne andò con la ricevuta firmata, Luca Bianchi affrontò Marco per l'ultima volta. Marco aveva appena firmato una modifica al contratto Castellano che avrebbe escluso completamente Luca dall'accordo — milioni di euro sfumati in un colpo solo. La lite degenerò. Luca afferrò il posacenere di marmo sul tavolo. Un singolo colpo. Poi prese la sua copia del contratto dalla cassaforte aperta e uscì.

Anna Moretti sapeva — aveva sentito tutto, aveva cancellato un'email incriminante — ma non poteva parlare senza ammettere i propri segreti. Sara Conti aveva visto la lite attraverso la finestra prima di suonare, ma non voleva complicazioni. Luca contava su questo silenzio.

Non aveva fatto i conti con di te.`;

const WRONG_TEXT = `Il caso è stato archiviato come conclusione errata. Il vero colpevole — Luca Bianchi — è rimasto in libertà. Anna Moretti, Sara Conti, o chiunque tu abbia accusato, hanno subito conseguenze ingiuste. Gli indizi c'erano tutti: la lite con Marco per il contratto Castellano, la presenza nello studio dalle 20:00 alle 21:15, la copia del contratto trafugata, il testimone oculare che non voleva parlare.

Il caso di Marco Ferretti resterà aperto. Nei registri della questura di Milano, è segnato come irrisolto.`;

export default function Resolution() {
  const [, setLocation] = useLocation();
  const [gameState] = useState(() => loadGameState());

  useEffect(() => {
    if (gameState.status === "playing") {
      setLocation("/");
    }
  }, [gameState.status, setLocation]);

  if (gameState.status === "playing") return null;

  const isWin = gameState.status === "solved";
  const accusedName = gameState.accusation ? SUSPECT_NAMES[gameState.accusation.suspectId] ?? gameState.accusation.suspectId : "—";
  const accusedMotive = gameState.accusation
    ? (MOTIVES.find((m) => m.id === gameState.accusation!.motiveId)?.label ?? gameState.accusation.motiveId)
    : "—";

  const handleReset = () => {
    resetGame();
    setLocation("/");
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Dramatic overlay lines */}
      <div className="fixed inset-0 pointer-events-none opacity-5"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 28px, hsl(var(--border)) 28px, hsl(var(--border)) 29px)" }}
      />

      <div className="w-full max-w-2xl space-y-10 relative z-10">
        {/* Status banner */}
        <div className={`text-center py-8 border-2 ${isWin ? "border-primary" : "border-destructive"}`}>
          <p className={`font-mono text-xs tracking-widest uppercase mb-3 ${isWin ? "text-primary" : "text-destructive"}`}>
            Dipartimento di Polizia di Milano // Sezione Omicidi // 1982
          </p>
          <h1 className={`text-4xl md:text-6xl font-serif font-black tracking-tighter uppercase ${isWin ? "text-foreground" : "text-destructive"}`}>
            {isWin ? "Caso Risolto" : "Caso Archiviato"}
          </h1>
          <p className={`font-mono text-sm mt-3 uppercase tracking-widest ${isWin ? "text-primary" : "text-muted-foreground"}`}>
            {isWin ? "Conclusione corretta — Caso 001 chiuso" : "Conclusione errata — Caso 001 irrisolto"}
          </p>
        </div>

        {/* Accusation filed */}
        <div className="border border-border p-6 bg-card/50 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Verbale di accusa</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline border-b border-border/30 pb-2">
              <span className="font-mono text-xs uppercase text-muted-foreground">Accusato</span>
              <span className="font-serif font-bold text-lg">{accusedName}</span>
            </div>
            <div className="flex justify-between items-baseline border-b border-border/30 pb-2">
              <span className="font-mono text-xs uppercase text-muted-foreground">Movente dichiarato</span>
              <span className="font-mono text-sm text-right max-w-[60%]">{accusedMotive}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-mono text-xs uppercase text-muted-foreground">Esito</span>
              <span className={`font-mono text-sm font-bold uppercase ${isWin ? "text-primary" : "text-destructive"}`}>
                {isWin ? "Corretto" : "Errato"}
              </span>
            </div>
          </div>
        </div>

        {/* The truth */}
        <div className={`border-l-4 p-6 space-y-4 ${isWin ? "border-primary bg-muted/20" : "border-destructive/60 bg-destructive/5"}`}>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {isWin ? "La verità sul Caso 001" : "La verità che non hai trovato"}
          </h2>
          {!isWin && (
            <div className="border border-destructive/30 p-3 bg-destructive/10">
              <p className="font-mono text-xs uppercase text-destructive tracking-widest">Il vero colpevole</p>
              <p className="font-serif text-xl font-bold mt-1">Luca Bianchi</p>
              <p className="font-mono text-xs text-muted-foreground mt-1">Movente: Disputa sul contratto Castellano</p>
            </div>
          )}
          <p className="font-mono text-sm text-foreground/90 leading-loose whitespace-pre-line">
            {isWin ? TRUTH : WRONG_TEXT}
          </p>
        </div>

        {/* New game */}
        <div className="flex flex-col items-center gap-4 pt-4">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            {isWin ? "Detective, il tuo lavoro qui è finito." : "Milano ha bisogno di detective migliori."}
          </p>
          <Button
            onClick={handleReset}
            className="font-mono uppercase tracking-widest px-12 py-6 text-base rounded-none bg-transparent border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          >
            Nuovo caso
          </Button>
        </div>
      </div>
    </div>
  );
}
