// ================= SURVEY B =================
// Social Visibility treatment — separate cohort, different session.
//
// Differences from Survey A:
//   — Participants enter their name upfront
//   — Their name is displayed on every round ("Responding as: ...")
//   — No ambiguous signal in any round
//   — Visibility warning banner shown throughout

const jsPsych = initJsPsych({ override_safe_mode: true });

const htmlButtonResponse = jsPsychHtmlButtonResponse;
const surveyHtmlForm     = jsPsychSurveyHtmlForm;

const respondent_id = "resp_" + Math.random().toString(36).substring(2, 10);

let PARTICIPANT_NAME = "";

// ================= ATTRIBUTE POOLS =================

const QUALIFICATIONS = ["BSc", "MSc"];

const UNIVERSITIES = [
  "Delhi University",
  "SOL Open University"
];

const EXPERIENCES = [
  "2 years full-time office experience",
  "3 years full-time office experience"
];

const SCHOLARSHIPS = {
  sc:      "Received national scholarship for Scheduled Caste (SC) students",
  general: "Received national scholarship for General category students"
};

// ================= HELPERS =================

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ================= PROFILE GENERATION =================

function generateProfile(casteBucket) {
  return {
    qualification: pickRandom(QUALIFICATIONS),
    university:    pickRandom(UNIVERSITIES),
    experience:    pickRandom(EXPERIENCES),
    scholarship:   SCHOLARSHIPS[casteBucket],
    caste_type:    casteBucket
  };
}

// ================= ATTRIBUTE DISPLAY =================

const ATTRIBUTE_KEYS = ["qualification", "university", "experience", "scholarship"];

const ATTRIBUTE_LABELS = {
  qualification: "Qualification",
  university:    "University",
  experience:    "Work Experience",
  scholarship:   "Scholarship"
};

function renderProfileCard(profile, label, attributeOrder) {
  const rows = attributeOrder.map(key => `
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

// ================= BUILD TASKS =================

function buildTasks() {
  const tasks = [];
  for (let t = 1; t <= 8; t++) {
    const leftIsSC = Math.random() < 0.5;
    const left     = generateProfile(leftIsSC ? "sc" : "general");
    const right    = generateProfile(leftIsSC ? "general" : "sc");
    tasks.push({
      taskNumber:     t,
      left,
      right,
      attributeOrder: shuffleArray(ATTRIBUTE_KEYS)
    });
  }
  return tasks;
}

const TASKS = buildTasks();

// ================= DATA SUBMISSION =================

function submitToSheet(demo) {
  const timestamp = new Date().toISOString();
  const allTrials = jsPsych.data.get().values();

  const taskRows = allTrials
    .filter(t => t.task_number !== undefined && t.trial_type === "html-button-response")
    .map(t => ({
      timestamp:       timestamp,
      respondent_id:   t.respondent_id   || "",
      participant_name: PARTICIPANT_NAME,
      survey:          "B",
      task_number:     t.task_number      || "",
      chosen:          t.chosen           || "",
      A_qualification: t.A_qualification  || "",
      A_university:    t.A_university     || "",
      A_experience:    t.A_experience     || "",
      A_scholarship:   t.A_scholarship    || "",
      A_caste:         t.A_caste          || "",
      B_qualification: t.B_qualification  || "",
      B_university:    t.B_university     || "",
      B_experience:    t.B_experience     || "",
      B_scholarship:   t.B_scholarship    || "",
      B_caste:         t.B_caste          || "",
      attr_order:      t.attr_order       || "",
      resp_age:        demo.age           || "",
      resp_gender:     demo.gender        || "",
      resp_education:  demo.education     || "",
      resp_profession: demo.profession    || "",
      resp_caste:      demo.caste         || ""
    }));

  fetch("https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID_HERE/exec", {
    method:  "POST",
    mode:    "no-cors",
    body:    JSON.stringify(taskRows),
    headers: { "Content-Type": "text/plain" }
  })
  .catch(error => console.error("Submission error:", error));
}

// ================= TIMELINE =================

const timeline = [];

// ---- INSTRUCTIONS ----
timeline.push({
  type: htmlButtonResponse,
  stimulus: `
    <div class="instructions-box">
      <div class="visibility-banner">
        ⚠️ <strong>Notice:</strong> Your choices in this survey, along with your name,
        will be visible to the other participants and facilitators in your group session.
      </div>
      <p>
        Imagine you are an <strong>HR professional</strong> at a company hiring for an
        <strong>Office Admin Assistant</strong> role.
      </p>
      <p>
        You will see <strong>8 pairs of candidate profiles (CVs)</strong>.
        For each pair, choose the candidate you would prefer to hire.
      </p>
    </div>
  `,
  choices: ["Continue"]
});

// ---- NAME COLLECTION ----
timeline.push({
  type:     surveyHtmlForm,
  preamble: `
    <div class="instructions-box">
      <p>Please enter your name. It will be visible to your group and facilitators
         alongside your choices.</p>
    </div>
  `,
  html: `
    <label>Your Full Name</label><br>
    <input type="text" name="participant_name" required placeholder="Enter your name"
           style="width:100%; padding:10px; font-size:16px; margin-top:8px;
                  border:1px solid #ccc; border-radius:6px;" />
  `,
  button_label: "Continue",
  on_finish: function(data) {
    PARTICIPANT_NAME = (data.response && data.response.participant_name) || "";
  }
});

// ---- CONSENT ----
timeline.push({
  type: htmlButtonResponse,
  stimulus: `
    <div class="instructions-box">
      <p>By clicking <strong>"I Agree"</strong> you confirm that you:</p>
      <ul style="text-align:left; max-width:500px; margin:0 auto;">
        <li>Are 18 years of age or older</li>
        <li>Understand that participation is voluntary</li>
        <li>Understand that your name and choices will be visible to your group</li>
      </ul>
    </div>
  `,
  choices: ["I do not agree", "I Agree"],
  on_finish: function(data) {
    if (data.response === 0) {
      jsPsych.endExperiment("You declined to participate. Thank you.");
    }
  }
});

// ---- TASK TRIALS ----

for (let i = 0; i < TASKS.length; i++) {
  const task = TASKS[i];

  timeline.push({
    type: htmlButtonResponse,
    stimulus: function() {
      return `
        <div class="task-header">
          <span class="task-counter">Round ${task.taskNumber} of 8</span>
          <p class="task-question">Which candidate would you prefer to hire?</p>
          ${PARTICIPANT_NAME
            ? `<p class="visibility-note">Responding as: <strong>${PARTICIPANT_NAME}</strong></p>`
            : ""}
        </div>
        <div class="profile-wrapper">
          ${renderProfileCard(task.left,  "Candidate A", task.attributeOrder)}
          ${renderProfileCard(task.right, "Candidate B", task.attributeOrder)}
        </div>
      `;
    },
    choices: ["Choose Candidate A", "Choose Candidate B"],
    data: {
      respondent_id: respondent_id,
      task_number:   task.taskNumber
    },
    on_finish: function(data) {
      data.chosen = data.response === 0 ? "A" : "B";

      data.A_qualification = task.left.qualification;
      data.A_university    = task.left.university;
      data.A_experience    = task.left.experience;
      data.A_scholarship   = task.left.scholarship;
      data.A_caste         = task.left.caste_type;

      data.B_qualification = task.right.qualification;
      data.B_university    = task.right.university;
      data.B_experience    = task.right.experience;
      data.B_scholarship   = task.right.scholarship;
      data.B_caste         = task.right.caste_type;

      data.attr_order = task.attributeOrder.join(",");
    }
  });
}

// ---- DEMOGRAPHICS ----

timeline.push({
  type:     surveyHtmlForm,
  preamble: `
    <div class="instructions-box">
      <h3>Optional Background Questions</h3>
      <p>These help us understand patterns across groups. All responses are optional.</p>
    </div>
  `,
  html: `
    <label>Age</label><br>
    <input type="number" name="age" min="18" max="80" placeholder="e.g. 24"
           style="width:100%; padding:8px; font-size:15px; margin-top:4px;
                  border:1px solid #ccc; border-radius:6px;" />
    <br><br>

    <label>Gender</label><br>
    <select name="gender">
      <option value="">Prefer not to say</option>
      <option>Male</option>
      <option>Female</option>
      <option>Non-binary</option>
      <option>Gender queer</option>
    </select>
    <br><br>

    <label>Education</label><br>
    <select name="education">
      <option value="">Prefer not to say</option>
      <option>High school or below</option>
      <option>Undergraduate</option>
      <option>Postgraduate</option>
      <option>PhD</option>
    </select>
    <br><br>

    <label>Profession</label><br>
    <select name="profession">
      <option value="">Prefer not to say</option>
      <option>Student</option>
      <option>Working (employed)</option>
      <option>Self-employed</option>
      <option>Unemployed</option>
    </select>
    <br><br>

    <label>Caste</label><br>
    <select name="caste">
      <option value="">Prefer not to say</option>
      <option>SC</option>
      <option>ST</option>
      <option>OBC</option>
      <option>General</option>
    </select>
  `,
  button_label: "Submit",
  data: { respondent_id },
  on_finish: function(data) {
    submitToSheet(data.response || {});
  }
});

// ---- END SCREEN ----

timeline.push({
  type:     htmlButtonResponse,
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
