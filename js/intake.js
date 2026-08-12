const { useState, useEffect } = React;

const SERVICES = [
  "AI Automation Consulting (for businesses)",
  "AI Fundamentals Course",
  "Python Lessons",
  "Data Science Lessons",
  "Kids Coding Lessons",
  "Personal Branding / Influencer Coaching",
  "Not sure — I need advice"
];

const BUDGETS = [
  "Under ₦100,000",
  "₦100,000 – ₦500,000",
  "₦500,000 – ₦2,000,000",
  "Above ₦2,000,000",
  "Prefer to discuss"
];

function genRefId(){
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2,6).toUpperCase();
  return `REQ-${t}-${r}`;
}

function Field({label, required, hint, children}){
  return (
    <div className="field">
      <label>{label}{required && <span className="req">*</span>}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function IntakeForm(){
  const [form, setForm] = useState({
    name:"", business:"", email:"", phone:"",
    service: SERVICES[0], budget: BUDGETS[0],
    details:"", source:""
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [storageOk, setStorageOk] = useState(true);

  const update = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));

  const validate = () => {
    const err = {};
    if(!form.name.trim()) err.name = "Please enter your name.";
    if(!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) err.email = "Enter a valid email address.";
    if(!form.phone.trim()) err.phone = "Please enter a phone number.";
    if(!form.details.trim()) err.details = "Tell us briefly what you need.";
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(!validate()) return;
    setSubmitting(true);
    const refId = genRefId();
    const record = {
      refId,
      ...form,
      submittedAt: new Date().toISOString()
    };
    try {
      await window.storage.set(`submission:${refId}`, JSON.stringify(record), true);
      setSubmitted(refId);
    } catch(err){
      setStorageOk(false);
    }
    setSubmitting(false);
  };

  const loadEntries = async () => {
    setLoadingEntries(true);
    try {
      const list = await window.storage.list('submission:', true);
      const keys = (list && list.keys) || [];
      const results = [];
      for(const k of keys){
        try {
          const res = await window.storage.get(k, true);
          if(res && res.value) results.push(JSON.parse(res.value));
        } catch(e){}
      }
      results.sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      setEntries(results);
    } catch(e){
      setStorageOk(false);
    }
    setLoadingEntries(false);
  };

  const toggleAdmin = () => {
    const next = !showAdmin;
    setShowAdmin(next);
    if(next) loadEntries();
  };

  if(submitted){
    return (
      <div className="panel success box">
        <div className="check">✓</div>
        <h2>Request received</h2>
        <p>Thanks — your details have been saved. Expect a reply within 1–2 business days with next steps.</p>
        <div className="refid">Reference: {submitted}</div>
        <div style={{marginTop:24}}>
          <button className="btn-ghost" onClick={() => { setSubmitted(null); setForm({name:"",business:"",email:"",phone:"",service:SERVICES[0],budget:BUDGETS[0],details:"",source:""}); }}>
            Submit another request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel box">
      <form onSubmit={handleSubmit} noValidate>
        <div className="row2">
          <Field label="Full name" required>
            <input value={form.name} onChange={update('name')} placeholder="Adaeze Okafor" />
            {errors.name && <div className="error">{errors.name}</div>}
          </Field>
          <Field label="Business name" hint="Leave blank if not applicable">
            <input value={form.business} onChange={update('business')} placeholder="Okafor Retail Ltd" />
          </Field>
        </div>

        <div className="row2">
          <Field label="Email" required>
            <input type="email" value={form.email} onChange={update('email')} placeholder="you@company.com" />
            {errors.email && <div className="error">{errors.email}</div>}
          </Field>
          <Field label="Phone / WhatsApp" required>
            <input value={form.phone} onChange={update('phone')} placeholder="+234 800 000 0000" />
            {errors.phone && <div className="error">{errors.phone}</div>}
          </Field>
        </div>

        <Field label="What do you need?" required>
          <select value={form.service} onChange={update('service')}>
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Estimated budget">
          <select value={form.budget} onChange={update('budget')}>
            {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>

        <Field label="Project details" required hint="What are you trying to achieve? Include timeline if you have one.">
          <textarea value={form.details} onChange={update('details')} placeholder="e.g. We want to automate customer replies on WhatsApp using AI, launch in 6 weeks..." />
          {errors.details && <div className="error">{errors.details}</div>}
        </Field>

        <Field label="How did you hear about us?">
          <input value={form.source} onChange={update('source')} placeholder="LinkedIn, referral, Google..." />
        </Field>

        <div className="submit-row">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Sending..." : "Send request"}
          </button>
          <span className="status">Your data is stored securely for follow-up.</span>
        </div>
        {!storageOk && <div className="error" style={{marginTop:10}}>Couldn't save your request — please try again.</div>}
      </form>

      <div className="footer-row">
        <span className="pill">Client Intake</span>
        <button className="admin-link" onClick={toggleAdmin}>{showAdmin ? "Hide" : "View"} stored submissions (admin)</button>
      </div>

      {showAdmin && (
        <div className="admin-panel">
          {loadingEntries ? (
            <div className="empty-state">Loading database...</div>
          ) : entries.length === 0 ? (
            <div className="empty-state">No submissions yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th><th>Name</th><th>Service</th><th>Contact</th><th>Details</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(en => (
                    <tr key={en.refId}>
                      <td>{en.refId}</td>
                      <td>{en.name}{en.business ? ` (${en.business})` : ""}</td>
                      <td>{en.service}</td>
                      <td>{en.email}<br/>{en.phone}</td>
                      <td style={{maxWidth:220}}>{en.details}</td>
                      <td>{new Date(en.submittedAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function App(){
  return (
    <React.Fragment>
      <div className="eyebrow">Work With Us</div>
      <h1>Tell us about your project</h1>
      <p className="sub">
        Fill this out and it goes straight into our client database — no spreadsheets,
        no lost WhatsApp messages. We follow up within 1–2 business days.
      </p>
      <IntakeForm />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
