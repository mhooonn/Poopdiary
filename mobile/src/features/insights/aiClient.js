import { normalizeAiSettings, parseInsightReport } from './aiModel';

/** @typedef {{endpoint:string,model:string,apiKey:string}} AiSettings */

/** @param {AiSettings} settings @param {typeof fetch} [fetchImpl] */
export async function listAiModels(settings, fetchImpl = fetch) {
  const config = normalizeAiSettings(settings);
  if (!config.apiKey) throw new Error('Add an API key in Developer tools first.');
  const response = await timedFetch(fetchImpl, `${config.endpoint}/models`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${config.apiKey}` },
  }, 20000);
  if (!response.ok) throw await responseError(response);
  const body = await response.json();
  if (!Array.isArray(body?.data)) throw new Error('The model list response is not supported.');
  return /** @type {{id?:unknown}[]} */ (body.data)
    .map((item) => item.id)
    .filter(isModelId)
    .sort((a, b) => a.localeCompare(b));
}

/** @param {unknown} value @returns {value is string} */
function isModelId(value) {
  return typeof value === 'string' && value.length > 0;
}

/** @param {AiSettings} settings @param {Record<string,unknown>} data @param {AbortSignal} [signal] @param {typeof fetch} [fetchImpl] */
export async function generateInsightReport(settings, data, signal, fetchImpl = fetch) {
  const config = normalizeAiSettings(settings);
  if (!config.apiKey) throw new Error('Add an API key in Developer tools first.');
  if (data.periodDays !== 7 && data.periodDays !== 30) throw new Error('Choose a 7-day or 30-day report.');
  const periodInstruction = data.periodDays === 7
    ? 'Create a 7-day report using the last 7 days only. Focus on recent patterns and useful comparisons within this week.'
    : 'Create a 30-day report using all 30 days. Look for patterns that repeat across the month. Do not reduce the analysis to the latest 7 days or call it a weekly report. Compare weeks only if there are enough records in both; otherwise use the available records without forcing a trend.';

  let response;
  try {
    response = await timedFetch(fetchImpl, `${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.25,
        messages: [
          { role: 'system', content: INSIGHT_SYSTEM_PROMPT },
          { role: 'user', content: `${periodInstruction}\nAnalyze this structured diary data and return the requested JSON report:\n${JSON.stringify(data)}` },
        ],
      }),
    }, 60000, signal);
  } catch {
    if (signal?.aborted) throw new Error('Analysis cancelled.');
    throw new Error('Could not reach the AI service. Check the endpoint and network, then try again.');
  }
  if (!response.ok) throw await responseError(response);

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('The AI service returned an invalid response. Try again.');
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('The AI service did not return report text. Try again.');
  return parseInsightReport(content);
}

/** @param {Response} response */
async function responseError(response) {
  if (response.status === 401 || response.status === 403) return new Error('The API key was rejected. Check it in Developer tools.');
  if (response.status === 404) return new Error('The endpoint or model was not found. Check the saved model ID.');
  if (response.status === 429) return new Error('The AI service is busy or rate-limited. Wait a moment and try again.');
  return new Error(`The AI service returned HTTP ${response.status}. Try again later.`);
}

/** @param {typeof fetch} fetchImpl @param {string} url @param {RequestInit} init @param {number} timeoutMs @param {AbortSignal} [callerSignal] */
async function timedFetch(fetchImpl, url, init, timeoutMs, callerSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  callerSignal?.addEventListener('abort', abort, { once: true });
  if (callerSignal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch {
    if (callerSignal?.aborted) throw new Error('Analysis cancelled.');
    if (controller.signal.aborted) throw new Error('The AI service took too long to respond. Try again.');
    throw new Error('Could not reach the AI service. Check the endpoint and network, then try again.');
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abort);
  }
}

const INSIGHT_SYSTEM_PROMPT = `You help someone understand their own bowel and lifestyle diary in GutLog. They want to feel better, not read a research paper. Give them a useful finding and something sensible to try. Write warm, natural, everyday English that a B1 English learner can understand. Speak directly to "you" and "your". Be clear and kind without greetings, praise, jokes or a long introduction.

Find the strongest useful link between stool shape, difficulty passing stool, urgency, pain or bloating and recorded foods, drinks, water or exercise. Look for differences that repeat when the person feels better or worse. Lead with that finding in ordinary words: for example, "Could juice be upsetting your stomach?" The summary must tell the person what you noticed about them, naming the relevant food, drink or habit and how they felt. For example: "You noted bloating more often on days you logged juice." It can mention the same subject as the headline, but should add the observation behind it. Avoid abstract lines such as "The clearest repeated difference involved symptoms" or "This gives you a change to test". One useful pattern and one action are enough; include a second only when it adds a different, helpful insight. Do not fill space with totals, a list of symptoms, or "the same meals had different outcomes" when that offers no useful lead.

Keep numbers and supporting comparisons in pattern evidence. Use "4 of 6", not "4/6". Say what the counts refer to: days or entries. Elsewhere, describe the meaning in plain words, such as "You recorded bloating more often on days with juice." Prefer "needing to rush to the toilet" to "urgency", and "hard to pass" to clinical descriptions of difficulty. Avoid research terms such as bowel outcomes, association, confounders, incidence, overlapping meals, moderate signal and symptom pattern. Do not invent awkward labels such as "juice-and-bowel days". Use short, complete sentences; choose fewer ideas rather than squeezing words into fragments.

Be honest about what the diary can show. Recorded water is not necessarily all the water they drank; missing exercise entries do not prove they were inactive. A missing food or drink entry does not mean they did not have it: in evidence, write "no juice entry" rather than "without juice" or "juice-free". A day without a bowel entry does not mean constipation, and a day without a symptom entry does not prove they felt well. Compare like with like, using days with relevant records. Do not combine record counts and day counts or invent missing values. If timing is unknown, do not say a food or drink came before the symptoms. Use "may" or "could" for a possible contributor. Explain any important limitation once in interpretation or dataGaps. The summary should describe the observation, without a separate disclaimer about proof or causation.

Every bowel record has stoolShape and stoolDescription. Use these shapes directly throughout the report: "hard pellets", "lumpy sausage-shaped stools", "sausage-shaped stools with cracks", "smooth, soft stools", "soft blobs with clear edges", "mushy stools" or "watery stools". Never use Type numbers or Bristol scale numbers. Keep soft blobs distinct from mushy or watery stools; soft blobs alone are not diarrhea. An unknown shape stays unknown.

The selected period is periodDays: 7 or 30. Consider the whole selected period, keeping either report equally short. For 30 days, favour links that repeat across the month; only discuss improvement or worsening when comparable records support it. The numbered days help you analyse the data: Day 1 is oldest and the last day is today. Never show these day numbers, ranges or lists to the reader. Use "this week", "this month", "on days with juice" or another natural description. If only part of the month has records, mention that briefly in dataGaps without making it the main finding.

Recommend a small, specific change to try over the next week, based on the useful finding. Change one thing at a time and keep other habits similar. For example, replace a usual juice with water or try a short walk after lunch when the records give a reason to test that change. Prefer helping the person feel better over asking them to improve the dataset. Do not make logging the main action when there is already a useful lead. If there is no useful link yet, return no patterns, say so simply, and suggest one focused observation instead of inventing a conclusion. nextCheck should ask about a change they can notice, such as less bloating or easier stools, without repeating the action. Do not diagnose a condition, prescribe treatment, set medical targets, suggest supplements or stopping prescribed treatment. Avoid shame, alarmist language and boilerplate disclaimers.

Return only valid JSON with this exact shape: {"headline":"one useful finding, max 90 characters","summary":"one or two natural sentences, max 160 characters","patterns":[{"title":"one clear pattern, max 65 characters","evidence":"a plain comparison with counts where available, max 120 characters","interpretation":"what this could mean for you, max 100 characters","confidence":"early|moderate|strong"}],"recommendations":[{"title":"one simple action, max 55 characters","action":"a practical change to try for a week, max 110 characters","reason":"why this is worth trying, max 80 characters"}],"nextCheck":"one change to notice next, max 100 characters","dataGaps":["one plain note about missing information, max 80 characters"]}. Use at most 2 patterns, 2 recommendations and 2 data gaps. An empty dataGaps array is fine. Keep each field useful and avoid repeating the same finding, advice or caveat in several places. Do not include markdown fences.`;
