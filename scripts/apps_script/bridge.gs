const API_BASE = 'https://YOUR-API.example.com'; // or http://localhost:8787 while testing
const API_KEY  = 'change_me_secret_key';

function runBridge(){
  const threads = GmailApp.search('is:starred newer_than:1d -in:chats');
  threads.forEach(t => {
    const m = t.getMessages().pop();
    const subj = m.getSubject()||'';
    const body = (m.getPlainBody()||'').slice(0,2000);
    const g1 = subj.match(/\[J:(\d{3,6})\]/);
    const g2 = body.match(/#(\d{3,6})/);
    const job = g1?.[1] || g2?.[1];
    if(!job) return;
    const link = 'https://mail.google.com/mail/u/0/#all/'+m.getId();
    const snippet = (subj.replace(/\[J:\d+\]/g,'').trim()) + (body ? ' — '+body.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)[0]?.slice(0,120) : '');
    UrlFetchApp.fetch(API_BASE + '/activities/ingest', {
      method:'post',
      contentType:'application/json',
      headers:{'x-api-key':API_KEY},
      payload: JSON.stringify({ job_no: job, subject: subj, snippet, gmail_link: link, source:'email' })
    });
  });
}
