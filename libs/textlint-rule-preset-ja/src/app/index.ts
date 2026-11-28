import { noNiAruFile } from "#/features/check-ni-aru-file/index.ts";
import { noTaigendome } from "#/features/check-taigendome/index.ts";
import { yomiyasu } from "#/features/check-yomiyasu/index.ts";

const preset = {
  rules: { yomiyasu, "no-taigendome": noTaigendome, "no-ni-aru-file": noNiAruFile },
  rulesConfig: { yomiyasu: true, "no-taigendome": true, "no-ni-aru-file": true },
};

export default preset;
