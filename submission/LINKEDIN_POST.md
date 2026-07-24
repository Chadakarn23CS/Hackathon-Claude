# LinkedIn post — exploring AI at the hackathon (GlycoTwin)

A ready-to-paste post about using AI to build GlycoTwin, framed as independent
personal learning in the direction of drug discovery. Copy the text between the
lines. Read the **"Before you post"** notes at the bottom first — they matter
because this project sits close to antibody-drug work.

---

## Post — main version (recommended)

Over a hackathon this month I set out to answer one thing for myself: can I actually use AI to build something real in the science I'm curious about?

The something became **GlycoTwin** — a mechanistic "digital twin" that links a bioreactor knob an engineer can turn to the N-glycan quality attributes on a therapeutic antibody's Fc region. Move a process parameter and it propagates all the way through the CHO cell's Golgi enzyme train to the final glycan — galactosylation, afucosylation, sialylation.

I built it end to end from **published literature only, on my own time**, and paired it with a governed AI agent loop (Proposer → Evaluator → Critic) that ran experiments in silico against the mechanistic model.

The part that surprised me: a belief taught across CHO manufacturing — that galactosylation drops at scale because CO₂ accumulates and acidifies the Golgi — didn't hold up in the model. Across bench → manufacturing scale, galactosylation barely moved (~52% → ~53%); the real lever turned out to be the **clone** (B4GALT1 expression), not the gas strategy. Reproducible, falsifiable, and traced to cited papers rather than fit to an answer.

What I took away is bigger than the result: AI let one curious person go from "I want to understand bioinformatics and drug discovery" to shipping a working, testable model of part of the CMC pipeline in days — reading the biology, encoding the mechanism, writing the tests, and pressure-testing the finding.

I'm sharing this because I want to keep learning out loud, especially where **AI meets antibody drug development**. If that's your world, I'd genuinely love to trade notes.

▶ Try the live tool (runs in your browser): https://chadakarn23cs.github.io/Hackathon-Claude/
🎥 3-min walkthrough: https://www.youtube.com/watch?v=Aw47CJOsea4

*Independent personal project, built from public data on personal time. Views are my own and don't represent my employer.*

#AI #DrugDiscovery #Bioinformatics #Biotech #MachineLearning #Antibodies #Learning

---

## Post — short version (if you want something lighter)

I spent a hackathon this month teaching myself how far AI can take one curious person in the science I care about.

The result: **GlycoTwin**, a mechanistic digital twin that connects a bioreactor setting to the N-glycan quality attributes on a therapeutic antibody — built from published literature only, on my own time, with an AI agent running experiments in silico.

Biggest surprise: a widely taught assumption (that antibody galactosylation drops at scale because CO₂ acidifies the Golgi) didn't hold in the model — the real lever was the clone, not the gas strategy.

The tool is just the instrument. What I'm actually walking away with is momentum toward **AI in drug discovery**, and a lot of new questions.

▶ https://chadakarn23cs.github.io/Hackathon-Claude/

*Personal project, public data, personal time. Views my own.*

#AI #DrugDiscovery #Bioinformatics #Biotech #Learning

---

## Before you post — keeping it clean vs. your day job

You flagged not wanting this to conflict with your work. The good news: this
project was already built to be safe on that front. Keep it that way:

1. **Say it's personal, keep it personal.** The post already carries "independent
   personal project, public data, personal time, views my own." Keep that line —
   it's the single most important sentence for avoiding any appearance of speaking
   for, or moonlighting against, your employer.
2. **Don't name your employer in the post, and don't tag them.** Naming a specific
   antibody-therapeutics company next to a post about antibody glycosylation can
   read as speaking on their behalf. Post as yourself.
3. **It uses zero employer material — say nothing that implies otherwise.** Every
   parameter is literature-sourced and page-cited; there's no proprietary data,
   model, code, or IP in here (see `../NOTICE` and the Provenance section of the
   README). Don't add anecdotes, numbers, or screenshots from work.
4. **Check your company policy before you hit post.** Because this is in the same
   therapeutic space you work in, quickly review your employer's external-
   communication / social-media / IP / outside-activity policy, or ask your
   manager or ethics/compliance contact if unsure. This isn't legal advice — it's
   the one prudent step for employer-adjacent content, and a two-line policy check
   now beats a conversation later.
5. **Frame drug discovery as growth, not a side business.** The post positions it
   as curiosity and upskilling that complements a biopharma career — which is
   exactly what it is. Keep it aspirational, not competitive.

## How to post
LinkedIn has no API you can post through here, so: copy the text of the version
you want, open LinkedIn → "Start a post", paste, and add the demo video or a
screenshot of the tool as media for reach. Emojis and hashtags survive the paste.
