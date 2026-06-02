const jsPsych = initJsPsych({ override_safe_mode: true });
const htmlButtonResponse = jsPsychHtmlButtonResponse;
const surveyHtmlForm = jsPsychSurveyHtmlForm;
const respondent_id = "resp_" + Math.random().toString(36).substring(2, 10);

const QUALIFICATIONS = ["BSc", "MSc"];
const UNIVERSITIES = ["Delhi University", "SOL Open University"];
const EXPERIENCES = ["2 years full-time office experience", "3 years full-time office experience"];
const SCHOLARSHIPS = {
  sc: "Received national scholarship for Scheduled Caste (SC) students",
  general: "Received national scholarship for General category students"
};
const AMBIGUOUS_SIGNAL = "Student member, All India Students' Federation (AISF)";

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickAmbiguousRounds() {
  return new Set(shuffleArray([1,2,3,4,5,6,7,8]).slice(0, 2));
}

function generateProfile(casteBucket, includeAmbiguous) {
  return {
    qualification: pickRandom(QUALIFICATIONS),
    university: pickRandom(UNIVERSITIES),
    experience: pickRandom(EXPERIENCES),
    scholarship: SCHOLARSHIPS[casteBucket],
    political: includeAmbiguous ? AMBIGUOUS_SIGNAL : null,
    caste_type: casteBucket
  };
}

const ATTRIBUTE_KEYS = ["qualification", "university", "experience", "scholarship"];
const ATTRIBUTE_LABELS = {
  qualification: "Qualification",
  university: "University",
  experience: "Work Experience",
  scholarship: "Scholarship",
  political: "Student Activity"
};

function renderProfileCard(profile, label, attributeOrder) {
  const keys = [...attributeOrder];
  if (profile.political) keys.push("political");
  const rows = keys.map(key => `
    <li>
      <span class="attr-label">${ATTRIBUTE_LABELS[key]}:</span>
      <span class="attr-value">${profile[key]}</span>
    </li>
  `).join("");
  return `
    <div class="profile-card">
      <div class="profile-header">${label}</div>
      <ul class="profile-list">${rows}</ul>
    </div>
  `;
}

function buildTasks() {
  const ambiguousRounds = pickAmbiguousRounds();
  const tasks = [];
  for (let t = 1; t <= 8; t++) {
    const hasAmbiguous = ambiguousRounds.has(t);
    const leftIsSC = Math.random() < 0.5;
    const left = generateProfile(leftIsSC ? "sc" : "general", hasAmbiguous);
    const right = generateProfile(leftIsSC ? "general" : "sc", hasAmbiguous);
    tasks.push({ taskNumber: t, left, right, hasAmbiguous, attributeOrder: shuffleArray(ATTRIBUTE_KEYS) });
  }
  return tasks;
}

const TASKS = buildTasks();

function submitToSheet(demo) {
  const timestamp = new Date().toISOString();
  const allTrials = jsPsych.data.get().values();
  const taskRows = allTrials
    .filter(t => t.task_number !== undefined && t.trial_type === "html-button-response")
    .map(t => ({
      timestamp: timestamp,
      respondent_id: t.respondent_id || "",
      task_number: t.task_number || "",
      chosen: t.chosen || "",
      has_ambiguous: t.has_ambiguous || false,
      A_qualification: t.A_qualification || "",
      A_university: t.A_university || "",
      A_experience: t.A_experience || "",
      A_scholarship: t.A_scholarship || "",
      A_political: t.A_political || "",
      A_caste: t.A_caste || "",
      B_qualification: t.B_qualification || "",
      B_university: t.B_university || "",
      B_experience: t.B_experience || "",
      B_scholarship: t.B_scholarship || "",
      B_political: t.B_political || "",
      B_caste: t.B_caste || "",
      attr_order: t.attr_order || "",
      resp_age: demo.age || "",
      resp_gender: demo.gender || "",
      resp_education: demo.education || "",
      resp_profession: demo.profession || "",
      resp_caste: demo.caste || ""
    }));
  fetch("https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID_HERE/exec", {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(taskRows),
    headers: { "Content-Type": "text/plain" }
  }).catch(error => console.error("Submission error:", error));
}

const timeline = [];

timeline.push({
  type: htmlButtonResponse,
  stimulus: `
    <div class="instructions-box">
      <p>Imagine you are an <strong>HR professional</strong> at a company hiring for an <strong>Office Admin Assistant</strong> role.</p>
      <p>You will see <strong>8 pairs of candidate profiles (CVs)</strong>. For each pair, choose the candidate you would prefer to hire.</p>
      <p>Some profiles may include additional background information about the candidates.</p>
      <h3>Confidentiality</h3>
      <p>This survey is completely anonymous and conducted for academic research only. Your responses cannot be traced back to you.</p>
    </div>
  `,
  choices: ["Continue"]
});

timeline.push({
  type: htmlButtonResponse,
  stimulus: `
    <div class="instructions-box">
      <p>By clicking <strong>"I Agree"</strong> you confirm that you:</p>
      <ul style="text-align:left; max-width:500px; margin:0 auto;">
        <li>Are 18 years of age or older</li>
        <li>Understand that participation is voluntary</li>
        <li>Consent to your anonymised responses being used for academic research</li>
      </ul>
    </div>
  `,
  choices: ["I do not agree", "I Agree"],
  on_finish: function(data) {
    if (data.response === 0) jsPsych.endExperiment("You declined to participate. Thank you.");
  }
});

for (let i = 0; i < TASKS.length; i++) {
  const task = TASKS[i];
  timeline.push({
    type: htmlButtonResponse,
    stimulus: function() {
      return `
        <div class="task-header">
          <span class="task-counter">Round ${task.taskNumber} of 8</span>
          <p class="task-question">Which candidate would you prefer to hire?</p>
        </div>
        <div class="profile-wrapper">
          ${renderProfileCard(task.left, "Candidate A", task.attributeOrder)}
          ${renderProfileCard(task.right, "Candidate B", task.attributeOrder)}
        </div>
      `;
    },
    choices: ["Choose Candidate A", "Choose Candidate B"],
    data: { respondent_id: respondent_id, task_number: task.taskNumber },
    on_finish: function(data) {
      data.chosen = data.response === 0 ? "A" : "B";
      data.has_ambiguous = task.hasAmbiguous;
      data.A_qualification = task.left.qualification;
      data.A_university = task.left.university;
      data.A_experience = task.left.experience;
      data.A_scholarship = task.left.scholarship;
      data.A_political = task.left.political || "";
      data.A_caste = task.left.caste_type;
      data.B_qualification = task.right.qualification;
      data.B_university = task.right.university;
      data.B_experience = task.right.experience;
      data.B_scholarship = task.right.scholarship;
      data.B_political = task.right.political || "";
      data.B_caste = task.right.caste_type;
      data.attr_order = task.attributeOrder.join(",");
    }
  });
}

timeline.push({
  type: surveyHtmlForm,
  preamble: `
    <div class="instructions-box">
      <h3>Optional Background Questions</h3>
      <p>These help us understand patterns across groups. All responses are optional and anonymous.</p>
    </div>
  `,
  html: `
    <label>Age</label><br>
    <input type="number" name="age" min="18" max="80" placeholder="e.g. 24"
           style="width:100%; padding:8px; font-size:15px; margin-top:4px; border:1px solid #ccc; border-radius:6px;" />
    <br><br>
    <label>Gender</label><br>
    <select name="gender">
      <option value="">Prefer not to say</option>
      <option>Male</option><option>Female</option>
      <option>Non-binary</option><option>Gender queer</option>
    </select>
    <br><br>
    <label>Education</label><br>
    <select name="education">
      <option value="">Prefer not to say</option>
      <option>High school or below</option><option>Undergraduate</option>
      <option>Postgraduate</option><option>PhD</option>
    </select>
    <br><br>
    <label>Profession</label><br>
    <select name="profession">
      <option value="">Prefer not to say</option>
      <option>Student</option><option>Working (employed)</option>
      <option>Self-employed</option><option>Unemployed</option>
    </select>
    <br><br>
    <label>Caste</label><br>
    <select name="caste">
      <option value="">Prefer not to say</option>
      <option>SC</option><option>ST</option><option>OBC</option><option>General</option>
    </select>
  `,
  button_label: "Submit",
  data: { respondent_id },
  on_finish: function(data) { submitToSheet(data.response || {}); }
});

timeline.push({
  type: htmlButtonResponse,
  stimulus: `
    <div class="instructions-box end-screen">
      <div class="end-icon">✓</div>
      <h2>Thank you for participating!</h2>
      <p>Your responses have been recorded.</p>
      <p class="pravah-credit">This study is conducted in partnership with <strong>Pravah NGO</strong>.</p>
    </div>
  `,
  choices: ["Finish"]
});

jsPsych.run(timeline);
