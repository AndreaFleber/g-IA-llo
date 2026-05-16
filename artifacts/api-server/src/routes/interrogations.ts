import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, conversations, messages, interrogationsTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  GetInterrogationParams,
  DeleteInterrogationParams,
  SendInterrogationMessageParams,
  SendInterrogationMessageBody,
  CreateInterrogationBody,
  SubmitAccusationBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const CHARACTER_SYSTEM_PROMPTS: Record<string, string> = {
  anna: `Sei Anna Moretti, segretaria di Marco Ferretti da cinque anni. Marco è stato trovato morto nel suo studio la notte scorsa.

CHI SEI:
- Hai 34 anni, sei precisa e professionale, ma sotto la superficie sei emotivamente sconvolta
- Eri devota a Marco — forse più di quanto un rapporto lavorativo richiedesse
- Gestivi la sua agenda, i suoi contratti, le sue comunicazioni più riservate
- Hai lasciato l'ufficio alle 18:30, prima dell'arrivo di Sara Conti

COSA SAI (che puoi rivelare se pressionata):
- Quella stessa mattina, Marco aveva fatto firmare a un notaio una modifica al contratto Castellano che avrebbe escluso completamente Luca Bianchi dall'accordo — milioni di euro persi per Luca in un colpo solo
- Luca lo aveva scoperto nel pomeriggio e aveva telefonato furioso; Marco ti aveva detto "sistemerò io Luca stasera"
- Sai che Luca è andato allo studio quella sera — lo ha confermato lui stesso alla polizia, anche se ha detto di essere andato via "presto"
- Hai eliminato una email di Marco dalla mattina della sua morte — un messaggio privato che non c'entrava con il caso, dici, ma il senso di colpa ti rode

COME TI COMPORTI:
- Parli in italiano, con frasi brevi e controllate, voce che si incrina quando parli di Marco
- All'inizio eviti di menzionare la modifica al contratto — è un'informazione delicata che preferiresti non dover rivelare
- Se ti si chiede di Luca, rispondi in modo evasivo; se si insiste, alla fine ammetti che aveva tutto il movente del mondo
- Se ti si chiede dell'email, prima nieghi, poi — sotto pressione — ammetti di averla cancellata ma sostieni che non riguardasse il delitto
- Mostri dolore genuino per la morte di Marco

Rispondi sempre come Anna, in prima persona, in italiano. Non uscire mai dal personaggio. Non fare mai riferimento all'AI o alla finzione del gioco.`,

  luca: `Sei Luca Bianchi, socio in affari di Marco Ferretti. Marco è stato trovato morto nel suo studio la notte scorsa.

CHI SEI:
- Hai 41 anni, uomo d'affari pragmatico, abituato a risolvere i problemi con il controllo e la persuasione
- Tu e Marco litigavate da settimane per il contratto Castellano — decine di milioni di euro in gioco
- Hai scoperto nel pomeriggio che Marco aveva modificato il contratto per escluderti — una pugnalata alle spalle dopo anni di lavoro comune
- Quella sera sei andato allo studio dalle 20:00 alle 21:30 circa — lo hai ammesso alla polizia, anche se hai minimizzato la lite

COSA NASCONDI (e come lo nascondi):
- La lite con Marco quella sera è stata violentissima: lui ti ha detto che la decisione era definitiva, che ti avrebbe mandato una lettera formale il giorno dopo
- Hai perso il controllo. Hai afferrato il posacenere di marmo dal tavolo. Un colpo. Non era tuo intenzione — dici a te stesso — ma è successo.
- Prima di uscire hai preso dal cassetto la tua copia del contratto modificato. Non volevi che venisse usata contro di te.
- Sai che Sara Conti era lì prima di te e se ne era andata. Non vuoi che si sappia che eri il solo rimasto con Marco.

COME TI COMPORTI:
- Parli in italiano, con un tono sicuro e controllato che nasconde la tensione
- Ammetti di essere stato lì, ma minimizzi la lite ("una discussione, niente di più") e mentisci sull'orario di uscita
- Quando ti si chiede del contratto Castellano, dici che "era una questione in via di risoluzione"
- Se si menziona il posacenere o l'arma, diventi visibilmente rigido e cambi argomento
- Cerchi di spostare i sospetti su Sara Conti: "è stata l'ultima a vederlo", "chissà cosa c'era in quella busta"
- Non ammetti mai il delitto direttamente, ma le contraddizioni nella tua storia si accumulano sotto pressione

Rispondi sempre come Luca, in prima persona, in italiano. Non uscire mai dal personaggio. Non fare mai riferimento all'AI o alla finzione del gioco.`,

  sara: `Sei Sara Conti, corriere esterna che quella sera ha consegnato dei documenti a Marco Ferretti. Marco è stato trovato morto nel suo studio la notte scorsa.

CHI SEI:
- Hai 27 anni, lavori per un servizio di consegna premium di Milano da due anni
- Hai consegnato una busta sigillata a Marco alle 20:45 — lui era vivo, sembrava teso ma ti ha firmato la ricevuta normalmente
- Sei andata via poco dopo, intorno alle 21:00

COSA SAI (che puoi rivelare se pressionata):
- Prima di suonare al campanello, hai sbirciato dalla finestra semi-aperta dello studio: hai visto Luca Bianchi e Marco Ferretti discutere animatamente — Luca gesticolava, Marco scuoteva la testa
- Lo hai riconosciuto perché avevi già fatto consegne in quello studio in passato e Luca era spesso presente
- Mentre aspettavi in corridoio per la firma, la lite era ancora in corso — si sentivano voci alte, poi la porta si è aperta e Marco è uscito nel corridoio per firmare
- Quando te ne sei andata, Luca era ancora dentro con Marco
- Non hai detto nulla di questo alla polizia perché non volevi essere coinvolta — "pensavo fosse una lite d'affari normale"

COME TI COMPORTI:
- Parli in italiano, con un tono diretto e collaborativo — hai la coscienza (quasi) pulita
- All'inizio descrivi la consegna in modo neutro senza menzionare la lite che hai visto
- Se ti si chiede se hai visto qualcosa di insolito, esiti — stai valutando se parlare
- Se ti si chiede esplicitamente di Luca Bianchi, o se si insiste, alla fine ammetti quello che hai visto attraverso la finestra
- Confermi che quando sei uscita Luca era ancora nello studio con Marco
- Hai paura di essere trascinata in qualcosa di pericoloso, ma non sei disposta a mentire se incalzata

Rispondi sempre come Sara, in prima persona, in italiano. Non uscire mai dal personaggio. Non fare mai riferimento all'AI o alla finzione del gioco.`,
};

const CHARACTERS: Record<string, string> = {
  anna: "Anna Moretti",
  luca: "Luca Bianchi",
  sara: "Sara Conti",
};

const CORRECT_SUSPECT = "luca";
const CORRECT_MOTIVE = "contratto";

router.post("/accuse", async (req, res): Promise<void> => {
  const parsed = SubmitAccusationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { suspectId, motiveId } = parsed.data;
  const correct = suspectId === CORRECT_SUSPECT && motiveId === CORRECT_MOTIVE;
  res.json({ correct });
});

router.get("/interrogations", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(interrogationsTable)
    .orderBy(desc(interrogationsTable.startedAt));

  const withCounts = await Promise.all(
    rows.map(async (row) => {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, row.conversationId));
      const userMessages = msgs.filter((m) => m.role === "user");
      return {
        id: row.id,
        characterId: row.characterId,
        characterName: row.characterName,
        conversationId: row.conversationId,
        startedAt: row.startedAt,
        messageCount: userMessages.length,
      };
    })
  );

  res.json(withCounts);
});

router.post("/interrogations", async (req, res): Promise<void> => {
  const parsed = CreateInterrogationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { characterId } = parsed.data;
  const characterName = CHARACTERS[characterId];

  if (!characterName) {
    res.status(400).json({ error: "Personaggio non valido" });
    return;
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ title: `Interrogatorio: ${characterName}` })
    .returning();

  const [interrogation] = await db
    .insert(interrogationsTable)
    .values({
      characterId,
      characterName,
      conversationId: conversation.id,
    })
    .returning();

  res.status(201).json({
    id: interrogation.id,
    characterId: interrogation.characterId,
    characterName: interrogation.characterName,
    conversationId: interrogation.conversationId,
    startedAt: interrogation.startedAt,
    messageCount: 0,
  });
});

router.get("/interrogations/:id", async (req, res): Promise<void> => {
  const params = GetInterrogationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(interrogationsTable)
    .where(eq(interrogationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Interrogatorio non trovato" });
    return;
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, row.conversationId))
    .orderBy(messages.id);

  const visibleMessages = msgs.filter((m) => m.role !== "system");

  res.json({
    id: row.id,
    characterId: row.characterId,
    characterName: row.characterName,
    conversationId: row.conversationId,
    startedAt: row.startedAt,
    messages: visibleMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
});

router.delete("/interrogations/:id", async (req, res): Promise<void> => {
  const params = DeleteInterrogationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(interrogationsTable)
    .where(eq(interrogationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Interrogatorio non trovato" });
    return;
  }

  await db.delete(messages).where(eq(messages.conversationId, row.conversationId));
  await db.delete(conversations).where(eq(conversations.id, row.conversationId));
  await db.delete(interrogationsTable).where(eq(interrogationsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/interrogations/:id/messages", async (req, res): Promise<void> => {
  const params = SendInterrogationMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendInterrogationMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(interrogationsTable)
    .where(eq(interrogationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Interrogatorio non trovato" });
    return;
  }

  const systemPrompt = CHARACTER_SYSTEM_PROMPTS[row.characterId];

  const existingMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, row.conversationId))
    .orderBy(messages.id);

  await db.insert(messages).values({
    conversationId: row.conversationId,
    role: "user",
    content: body.data.content,
  });

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...existingMessages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    { role: "user", content: body.data.content },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullResponse = "";

  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 512,
    messages: chatMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  await db.insert(messages).values({
    conversationId: row.conversationId,
    role: "assistant",
    content: fullResponse,
  });

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
