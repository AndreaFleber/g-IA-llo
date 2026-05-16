import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CHARACTERS = [
  {
    id: "anna",
    name: "Anna Moretti",
    role: "Segretaria di Marco",
    description:
      "Lavora con Marco da cinque anni. Conosce ogni dettaglio del suo studio e dei suoi affari. Appare collaborativa, ma qualcosa nella sua voce tradisce l'agitazione.",
    suspicionLevel: 42,
  },
  {
    id: "luca",
    name: "Luca Bianchi",
    role: "Socio in affari",
    description:
      "Partner commerciale di Marco. Erano in disaccordo su un contratto milionario. Si dichiara innocente, ma la sua difesa sembra preparata un po' troppo bene.",
    suspicionLevel: 71,
  },
  {
    id: "sara",
    name: "Sara Conti",
    role: "Corriere esterna",
    description:
      "L'ultima persona ad aver visto Marco vivo. Ha consegnato dei documenti quella sera. Dice che era tutto normale — ma gli occhi raccontano un'altra storia.",
    suspicionLevel: 28,
  },
];

router.get("/characters", async (_req, res): Promise<void> => {
  res.json(CHARACTERS);
});

export default router;
