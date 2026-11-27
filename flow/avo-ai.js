/* Avo's built-in brain (v0). No external model: a rule-based parser that returns
   { reply, actions:[{tool,args}] }. The app runs the actions against Supabase.
   To plug in a real model later:  AvoAI.setProvider(async (message, ctx) => ({reply, actions}))  */
(function (g) {
  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const fmtTime = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const startOf = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  function dayLabel(d, now) {
    const diff = Math.round((startOf(d) - startOf(now)) / 864e5);
    return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const dueLabel = (d, hasTime, now) => dayLabel(d, now) + (hasTime ? ' ' + fmtTime(d) : '');

  function parseWhen(text, now) {
    let s = ' ' + text + ' ', date = null, hasTime = false, m;
    const base = startOf(now), cut = x => { s = s.replace(x, ' '); };
    const add = n => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
    if ((m = s.match(/\bday after tomorrow\b/i))) { date = add(2); cut(m[0]); }
    else if ((m = s.match(/\btomorrow\b/i))) { date = add(1); cut(m[0]); }
    else if ((m = s.match(/\b(today|tonight)\b/i))) { date = add(0); cut(m[0]); }
    else if ((m = s.match(/\bnext week\b/i))) { date = add(7); cut(m[0]); }
    else if ((m = s.match(/\bin (\d+) (day|days|week|weeks)\b/i))) { date = add(+m[1] * (/week/i.test(m[2]) ? 7 : 1)); cut(m[0]); }
    else if ((m = s.match(/\b(?:(?:next|this|on)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/i))) {
      const wd = DAYS.findIndex(x => x.startsWith(m[1].toLowerCase().slice(0, 3)));
      let diff = (wd - base.getDay() + 7) % 7; if (diff === 0) diff = 7;
      date = add(diff); cut(m[0]);
    }
    let h = null, min = 0;
    if ((m = s.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i))) {
      h = +m[1] % 12 + (/pm/i.test(m[3]) ? 12 : 0); min = +(m[2] || 0); cut(m[0]);
    } else if ((m = s.match(/\bat\s+(\d{1,2}):(\d{2})\b/i))) { h = +m[1]; min = +m[2]; cut(m[0]); }
    else if ((m = s.match(/\b(?:at\s+)?noon\b/i))) { h = 12; cut(m[0]); }
    if (h !== null) {
      hasTime = true;
      if (!date) { date = new Date(base); const t = new Date(base); t.setHours(h, min); if (t < now) date.setDate(date.getDate() + 1); }
      date.setHours(h, min, 0, 0);
    }
    const clean = s.replace(/\s+(on|at|by|for|due)\s*$/i, '').replace(/\s+/g, ' ').trim();
    return { date, hasTime, text: clean };
  }
  const tidy = t => t.replace(/^(to|for|that|:)\s+/i, '').replace(/[.!?]+$/, '').trim();
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  function best(list, key, q) {
    const w = q.toLowerCase().split(/\W+/).filter(x => x.length > 2); let top = null, sc = 0;
    list.forEach(i => { const s = w.filter(x => String(i[key]).toLowerCase().includes(x)).length; if (s > sc) { sc = s; top = i; } });
    return top;
  }

  const AvoAI = {
    provider: null,
    setProvider(fn) { this.provider = fn; },
    async respond(msg, ctx) {
      if (this.provider) { try { return await this.provider(msg, ctx); } catch (e) { console.warn('AI provider failed, using built-in', e); } }
      return this.local(msg, ctx);
    },
    local(msg, ctx) {
      const now = ctx.now || new Date(), q = msg.trim(), l = q.toLowerCase(), A = [];
      const open = ctx.tasks.filter(t => !t.done);
      let m;
      if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(l))
        return { reply: `Hi ${ctx.name}! You have ${open.length} open task${open.length === 1 ? '' : 's'}. Want me to plan your day?` };

      if ((m = q.match(/^(?:complete|finish|done with|mark)\s+(?:the\s+)?(?:task\s+)?(.+?)(?:\s+(?:as\s+)?(?:done|complete|completed))?$/i))) {
        const t = best(open, 'title', m[1]);
        if (t) return { reply: `Marked “${t.title}” as done. Nice work.`, actions: [{ tool: 'complete_task', args: { id: t.id, title: t.title } }] };
        return { reply: `I couldn’t find an open task matching “${m[1]}”.` };
      }
      if ((m = q.match(/(?:turn on|enable|turn off|disable|pause|resume)\s+(?:the\s+)?(?:automation\s*)?(.*)/i)) && /automation|turn|enable|disable|pause/.test(l) && ctx.automations.length) {
        const on = /turn on|enable|resume/i.test(q), a = best(ctx.automations, 'name', m[1] || '') || null;
        if (a) return { reply: `${on ? 'Enabled' : 'Paused'}: ${a.name}.`, actions: [{ tool: 'toggle_automation', args: { id: a.id, enabled: on, name: a.name } }] };
      }
      if ((m = q.match(/(?:add|create|new|save)\s+(?:a\s+)?(?:new\s+)?(?:customer|client|contact)\s+(?:named\s+|called\s+)?(.+)/i))) {
        let rest = m[1], email = (rest.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0], phone = (rest.match(/\+?\d[\d\s().-]{6,}\d/) || [])[0];
        if (email) rest = rest.replace(email, ''); if (phone) rest = rest.replace(phone, '');
        const name = tidy(rest.replace(/\b(email|phone|number|at|,)\b/gi, ' ').replace(/\s+/g, ' '));
        if (name) return { reply: `Added ${name} to your customers${email ? ' (' + email + ')' : ''}.`, actions: [{ tool: 'create_customer', args: { name: cap(name), email, phone } }] };
      }
      if ((m = q.match(/follow[\s-]?up\s+(?:with|on)\s+(.+)/i))) {
        const w = parseWhen(m[1], now), who = tidy(w.text) || 'customer', due = w.date ? dueLabel(w.date, w.hasTime, now) : 'Tomorrow';
        return { reply: `Follow-up created: “Follow up with ${cap(who)}” (${due}).`, actions: [{ tool: 'create_task', args: { title: 'Follow up with ' + cap(who), due, priority: 'High' } }] };
      }
      if ((m = q.match(/(?:schedule|book|set up|add)\s+(?:a\s+|an\s+)?(meeting|call|appointment|event)?\s*(?:with\s+)?(.+)/i)) && /schedule|book|set up|meeting|call|appointment/.test(l) && !/task/.test(l)) {
        const w = parseWhen(m[2], now), kind = /call/i.test(m[1] || q) ? 'call' : 'meeting';
        let who = tidy(w.text); const title = who ? `${kind === 'call' ? 'Call' : 'Meeting'} with ${cap(who)}` : cap(kind);
        const d = w.date || new Date(startOf(now).getTime() + 864e5), when = new Date(d);
        if (!w.hasTime) when.setHours(9, 0, 0, 0);
        return { reply: `Scheduled “${title}” for ${dueLabel(when, true, now)}.`, actions: [{ tool: 'create_appointment', args: { title, starts_at: when.toISOString(), ends_at: new Date(+when + 36e5).toISOString(), kind } }] };
      }
      if ((m = q.match(/(?:create|add|new|make)\s+(?:a\s+)?(?:new\s+)?task\s*(?:to|for|:)?\s*(.+)/i)) || (m = q.match(/remind me\s+(?:to\s+)?(.+)/i))) {
        const w = parseWhen(m[1], now); let pri = 'Medium', t = w.text;
        if (/\b(urgent|asap|high priority|important)\b/i.test(t)) { pri = 'High'; t = t.replace(/\b(urgent|asap|high priority|important)\b/ig, ''); }
        if (/\blow priority\b/i.test(t)) { pri = 'Low'; t = t.replace(/\blow priority\b/ig, ''); }
        t = cap(tidy(t.replace(/\s+/g, ' ')));
        if (t) { const due = w.date ? dueLabel(w.date, w.hasTime, now) : null;
          return { reply: `Done. Added “${t}”${due ? ' (' + due + ')' : ''}${pri === 'High' ? ' as high priority' : ''}.`, actions: [{ tool: 'create_task', args: { title: t, due, priority: pri } }] }; }
      }
      if ((m = q.match(/draft\s+(?:an?\s+)?(?:email|reply|message|note)(?:\s+to\s+(.+?))?(?:\s+(?:about|regarding|saying|that)\s+(.+))?$/i))) {
        const to = m[1] ? cap(tidy(m[1])) : 'there', topic = m[2] ? tidy(m[2]) : '';
        const body = `Hi ${to.split(' ')[0]},\n\n${topic ? 'I wanted to reach out about ' + topic + '.' : 'I wanted to follow up on our last conversation.'} Let me know what time works for you this week.\n\nBest,\n${ctx.name}`;
        return { reply: `Here’s a draft. I haven’t sent anything:\n\n${body}`, actions: [{ tool: 'log', args: { text: 'Drafted an email to ' + to } }] };
      }
      if (/\b(plan|agenda|my day|today|schedule)\b/.test(l) && !/task/.test(l)) {
        const today = ctx.appts.filter(a => startOf(new Date(a.starts_at)).getTime() === startOf(now).getTime());
        const lines = today.map(a => `• ${fmtTime(new Date(a.starts_at))} ${a.title}`);
        const tk = open.slice(0, 4).map(t => `• ${t.title}${t.due ? ' (' + t.due + ')' : ''}`);
        return { reply: `Here’s your day:\n${lines.join('\n') || '• No appointments today'}\n\nTop tasks:\n${tk.join('\n') || '• Nothing open'}` };
      }
      if (/\b(task|todo|to-do)s?\b/.test(l)) {
        return { reply: open.length ? `You have ${open.length} open task${open.length === 1 ? '' : 's'}:\n` + open.slice(0, 6).map(t => `• ${t.title}${t.due ? ' (' + t.due + ')' : ''}`).join('\n') : 'No open tasks. Tell me one to add.' };
      }
      if (/\b(customer|client)s?\b/.test(l)) {
        return { reply: ctx.customers.length ? `You have ${ctx.customers.length} customers. Most recent:\n` + ctx.customers.slice(0, 5).map(c => `• ${c.name}${c.status ? ' · ' + c.status : ''}`).join('\n') : 'No customers yet. Try “add customer Jane Doe jane@email.com”.' };
      }
      if (/\b(email|inbox|gmail)\b/.test(l))
        return { reply: 'Inbox sync isn’t connected yet. For now I can draft emails: try “draft an email to Sarah about the quote”.' };
      if (/\b(help|what can you do|commands)\b/.test(l) || l === '?')
        return { reply: 'I can:\n• add tasks: “add task call John tomorrow 3pm”\n• finish tasks: “complete task call John”\n• schedule: “schedule a meeting with Sarah friday 2pm”\n• customers: “add customer Jane Doe jane@x.com”\n• follow-ups: “follow up with Maria tomorrow”\n• draft emails: “draft an email to Sarah about the quote”\n• plan your day: “plan my day”' };
      return { reply: 'I’m running on a simple built-in brain for now, so I didn’t catch that. Try “help” to see what I can do.' };
    }
  };
  g.AvoAI = AvoAI;
})(window);
