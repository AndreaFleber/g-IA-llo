import { useState, useRef, useEffect, FormEvent } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetInterrogation, getGetInterrogationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, ArrowLeft, Send, Target } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { incrementQuestionCount, loadGameState, MIN_QUESTIONS_TO_ACCUSE } from "@/lib/game-state";

export default function Interrogation() {
  const params = useParams();
  const interrogationId = Number(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: interrogation, isLoading, error } = useGetInterrogation(interrogationId);

  const [question, setQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(() => loadGameState().totalQuestions);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interrogation?.messages, streamingResponse]);

  const canAccuse = totalQuestions >= MIN_QUESTIONS_TO_ACCUSE;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isStreaming) return;

    const currentQuestion = question.trim();
    setQuestion("");
    setIsStreaming(true);
    setStreamingResponse("");

    const newCount = incrementQuestionCount();
    setTotalQuestions(newCount);

    queryClient.setQueryData(getGetInterrogationQueryKey(interrogationId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [
          ...old.messages,
          {
            id: Date.now(),
            role: "user",
            content: currentQuestion,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    try {
      const response = await fetch(`/api/interrogations/${interrogationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: currentQuestion }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                setStreamingResponse((prev) => prev + data.content);
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setStreamingResponse((prev) => prev + "\n[ERRORE DI COMUNICAZIONE. RIPROVARE.]");
    } finally {
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: getGetInterrogationQueryKey(interrogationId) });
      setStreamingResponse("");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-primary">
        RECUPERO FASCICOLO...
      </div>
    );
  }

  if (error || !interrogation) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-mono p-4 text-center">
        <h2 className="text-destructive text-2xl font-bold mb-4">FASCICOLO NON TROVATO</h2>
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          TORNA ALL'ARCHIVIO
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col max-w-5xl mx-auto py-4 md:py-8 px-4 h-screen">
      {/* Header */}
      <header className="flex-none flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-2 border-border pb-4 mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-4 py-2 border border-border bg-transparent hover:bg-secondary text-foreground font-mono uppercase"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Archivio
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              Soggetto: {interrogation.characterName}
            </h1>
            <p className="font-mono text-muted-foreground text-xs uppercase mt-1 flex items-center gap-2">
              <FileText className="h-3 w-3" /> Verbale n.{" "}
              {interrogation.id.toString().padStart(4, "0")} //{" "}
              {format(new Date(interrogation.startedAt), "dd MMM yyyy", { locale: it })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {canAccuse && (
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 font-mono text-xs uppercase tracking-widest border border-destructive/60 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Target className="h-3 w-3" /> Accusa
            </Link>
          )}
          <div className="text-right">
            <p className="font-mono text-primary text-xs font-bold uppercase">
              {totalQuestions} dom. poste
            </p>
            {!canAccuse && (
              <p className="font-mono text-muted-foreground text-xs">
                ancora {MIN_QUESTIONS_TO_ACCUSE - totalQuestions} per poter accusare
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Transcript Area */}
      <main className="flex-1 overflow-y-auto bg-card border border-border p-4 md:p-8 relative shadow-inner flex flex-col gap-6 custom-scrollbar">
        {interrogation.messages.length === 0 && !isStreaming && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50">
            <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
            <p className="font-mono text-center max-w-md text-muted-foreground uppercase">
              Il soggetto è seduto di fronte a te. L'aria è tesa.
              <br />
              <br />
              Fai la prima domanda.
            </p>
          </div>
        )}

        {interrogation.messages.map((msg, i) => (
          <div
            key={msg.id || i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%] ${
              msg.role === "user" ? "ml-auto" : "mr-auto"
            }`}
          >
            <span className="font-mono text-[10px] text-muted-foreground mb-1 uppercase tracking-widest">
              {msg.role === "user" ? "Detective" : interrogation.characterName}
            </span>
            <div
              className={`p-4 font-mono leading-relaxed ${
                msg.role === "user"
                  ? "bg-secondary text-secondary-foreground border border-border"
                  : "bg-transparent text-foreground border-l-2 border-primary/50"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isStreaming && streamingResponse && (
          <div className="flex flex-col items-start max-w-[85%] mr-auto">
            <span className="font-mono text-[10px] text-primary mb-1 uppercase tracking-widest">
              {interrogation.characterName}
            </span>
            <div className="p-4 font-mono leading-relaxed bg-transparent text-foreground border-l-2 border-primary">
              {streamingResponse}
              <span className="typewriter-cursor"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="flex-none mt-6">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isStreaming}
            placeholder="Digita la tua domanda, Detective..."
            className="flex-1 font-mono bg-card border-border rounded-none focus-visible:ring-primary focus-visible:border-primary text-foreground placeholder:text-muted-foreground h-12"
            autoFocus
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={isStreaming || !question.trim()}
            className="h-12 px-8 rounded-none font-mono uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            {isStreaming ? (
              "Attendere..."
            ) : (
              <span className="flex items-center gap-2">
                Invia <Send className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>
      </footer>
    </div>
  );
}
