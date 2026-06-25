const process = require("node:process");
const https = require("node:http");
const fs = require("node:fs");

// --------------------------- //
// -->  Data management
// --------------------------- //
let username;
let password;
let number;
let range = { start: 0, end: 0 };
let text;
let targetsFile;
let method;
const methods = { single: 0, range: 1, file: 2 };

// --------------------------- //
// -->  State management
// --------------------------- //
let state = 0;
const states = {
  getUsername: 0,
  getPassword: 1,
  getNumber: 2,
  getMethod: 3,
  getSingle: 4,
  getRangeStart: 5,
  getRangeEnd: 6,
  getTargetsFile: 7,
  getText: 8,
};

// --------------------------- //
// -->  Input/Output handler
// --------------------------- //
console.log(`
              mmmm  mmmmmm mmmmm    mm   m    m   mm   mm   m
             #"   " #      #   "#   ##   #    #   ##   #"m  #
             "#mmm  #mmmmm #mmm#"  #  #  #mmmm#  #  #  # #m #
             "# #      #       #mm#  #    #  #mm#  #  # #
             "mmm#" #mmmmm #      #    # #    # #    # #   ##

                    mmm   mmmm   mmmm mmmmmmm   mm   mmmmm 
                 m"   " m"  "m #"   "   #      ##   #   "#
                 #   mm #    # "#mmm    #     #  #  #mmmm"
                 #    # #    #     "#   #     #mm#  #   "m
                  "mmm"  #mm#  "mmm#"   #    #    # #    "

                   mmm    mmm   m mm    mmm#   mmm    m mm 
                  #   "  #"  #  #"  #  #" "#  #"  #   #"  "
                   """m  #""""  #   #  #   #  #""""   #    
                  "mmm"  "#mm"  #   #  "#m##  "#mm"   #    

by Uryzen317
visit @ https://github.com/Uryzen317/sepahan-gostar-sms-sender
`);
process.stdout.write("[01] Enter Username : ");
process.stdin.on("data", (chunk) => {
  const data = chunk.toString().trim();

  switch (state) {
    case states.getUsername: {
      username = data;
      state++;
      process.stdout.write("[02] Enter Password : ");
      break;
    }
    case states.getPassword: {
      password = data;
      state++;
      process.stdout.write("[03] Enter Number : ");
      break;
    }
    case states.getNumber: {
      number = data;
      state++;
      process.stdout.write("[04] Enter Method :\n * Single [0]\n * Batch (range) [1]\n * Batch (.txt file) [2]\n Select one of the options : ");
      break;
    }
    case states.getMethod: {
      method = parseInt(data);

      if (method === methods.single) {
        process.stdout.write("[05] Enter Target Number : ");
        state = states.getSingle;
      }

      if (method === methods.range) {
        process.stdout.write("[05] Enter Range [start] : ");
        state = states.getRangeStart;
      }

      if (method === methods.file) {
        process.stdout.write("[05] Enter Targets file name (eg. targets.txt) [file must be in cwd path] : ");
        state = states.getTargetsFile;
      }

      break;
    }
    case states.getSingle: {
      range.start = parseInt(data) || 0;
      range.end = parseInt(data) || 0;
      state = states.getText;
      process.stdout.write("[06] Enter Text file name (eg. text.txt) [file must be in cwd path] : ");
      break;
    }
    case states.getRangeStart: {
      range.start = parseInt(data) || 0;
      process.stdout.write("[06] Enter Range [end] : ");
      state = states.getRangeEnd;
      break;
    }
    case states.getRangeEnd: {
      range.end = parseInt(data) || 0;
      process.stdout.write("[07] Enter Text file name (eg. text.txt) [file must be in cwd path] : ");
      state = states.getText;
      break;
    }
    case states.getTargetsFile: {
      try {
        targetsFile = fs.readFileSync(data || "targets.txt", { encoding: "utf-8" });
      } catch (err) {
        console.log("[ERROR] No file found for targets data. Please ensure file exists in the cwd path.");
        process.exit(0);
      }
      process.stdout.write("[06] Enter Text file name (eg. text.txt) [file must be in cwd path] : ");
      state = states.getText;
      break;
    }
    case states.getText: {
      try {
        text = fs.readFileSync(data || "text.txt", { encoding: "utf-8" });
      } catch (err) {
        console.log("[ERROR] No file found for text data. Please ensure file exists in the cwd path.");
        process.exit(0);
      }
      console.table({ username, password, number, range, text });
      init();
      break;
    }
  }
});

// --------------------------- //
// -->  Start app procedure
// --------------------------- //
async function init() {
  let counter = 1;
  let targets;

  if (method === methods.single || method === methods.range) targets = getTargets();
  else if (method === methods.file) targets = targetsFile.split("\n").map((t) => t.trim());
  console.log(`Generated total of ${targets.length} targets.`);

  for await (const target of targets) {
    const url = `http://login.sepahangostar.com/sendSmsViaURL.aspx?userName=${username}&password=${password}&domainName=sepahansms&smsText=${text}&reciverNumber=${target}&senderNumber=${number}`;
    let success;
    let err;

    try {
      const res = await sendRequest(url);
      success = parseInt(res.split("\n")[0].replaceAll("undefined", "")) > 0 ? true : false;
      if (!success) err = " (code " + res.split("\n")[0].replaceAll("undefined", "").trim().toString() + ")";
    } catch (err) {
      success = false;
      err = " (code NETWORK)";
    }

    console.log(`${counter} of ${targets.length} was sent with ${success ? "SUCCESS" : "FAILURE" + err} [${target}]`);
    counter++;
  }

  console.log("Process completed.");
  process.exit(0);
}

// --------------------------- //
// -->  Generate number batch
// --------------------------- //
function getTargets() {
  const diviation = range.end - range.start + 1;
  const targets = new Array(diviation).fill(null);
  return targets.map((_t, i) => range.start + i);
}

// --------------------------- //
// -->  Send HTTP request
// --------------------------- //
async function sendRequest(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET" }, (res) => {
      let data;
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
      res.on("error", (err) => reject(err));
    });
    req.on("error", (err) => reject(err));
    req.end();
  });
}
