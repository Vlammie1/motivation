// Afgeleide queries (zoals de projectstatistieken) worden gecachet zolang er
// niets aan de sessies verandert. Elke schrijfactie op work_log_entries hoogt
// deze teller op, waarmee elke cache die eraan hangt vanzelf vervalt.
let epoch = 0;

export const workDataEpoch = () => epoch;

export const bumpWorkDataEpoch = () => {
    epoch += 1;
};
