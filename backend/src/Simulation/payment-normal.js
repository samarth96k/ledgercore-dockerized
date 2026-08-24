import http from "k6/http";
import { check } from "k6";

/*
|--------------------------------------------------------------------------
| ENVIRONMENT
|--------------------------------------------------------------------------
|
| BASE_URL should point to the banking API base.
|
| Example:
| BASE_URL=http://localhost:3000/banking
|
| LOGIN_URL:
| http://localhost:3000/api/user/login
|
|--------------------------------------------------------------------------
*/

const BASE_URL = __ENV.BASE_URL;
const LOGIN_URL = __ENV.LOGIN_URL;

/*
|--------------------------------------------------------------------------
| TEST USERS
|--------------------------------------------------------------------------
|
| Local/test environment only.
|
| Each user represents a USER_WALLET account.
|
| We authenticate every user once in setup() and then randomly
| select authenticated users during the actual load test.
|
|--------------------------------------------------------------------------
*/

const PASSWORD = "root@QWERTY1";

  const USERS = [
  {
    email: "aditya.sharma@gmail.com",
    name: "Aditya Sharma",
    accountId: "a412c563-ce39-411b-b2f5-f77e7edcf138",
  },

  {
    email: "jinanshverma@gmail.com",
    name: "Jinansh Verma",
    accountId: "1e528295-ae78-4f56-9464-385567c5490e",
  },

  {
    email: "pratyaksh@gmail.com",
    name: "Pratyaksh Gupta",
    accountId: "77d3cf69-bd54-4082-9586-537f0df6214b",
  },

  {
    email: "ishaan.agarwal@gmail.com",
    name: "Ishaan Agarwal",
    accountId: "2301e07f-feeb-4d5c-a646-5ca122b100c5",
  },

  {
    email: "snehsingh@gmail.com",
    name: "Sneh Singh",
    accountId: "65058ec3-0ac0-41e5-82a3-c9328ea47cbe",
  },

  {
    email: "yadav@gmail.com",
    name: "Yadav Yadav",
    accountId: "40321a9c-b558-42b6-9daa-02ba1a7582bb",
  },

  {
    email: "aakashjain@gmail.com",
    name: "Aakash Jain",
    accountId: "a7bb74c3-a4c0-4f22-8231-fd68fda06e61",
  },

  {
    email: "priyavrat@gmail.com",
    name: "Priyavrat Khanna",
    accountId: "a82eef0e-2750-4396-90be-7b766d63e866",
  },

  {
    email: "ayush.kapoor@gmail.com",
    name: "Ayush Kapoor",
    accountId: "4f5e520b-794d-4c21-90e1-7b5aca2bd5ea",
  },

  {
    email: "pranavmalhotra@gmail.com",
    name: "Pranav Malhotra",
    accountId: "17862f54-4844-4f2e-950d-02ba1bab8d45",
  },

  {
    email: "samarth@gmail.com",
    name: "Samarth Bansal",
    accountId: "8f553796-3a08-4fc7-a8e2-8f653f3221db",
  },

  {
    email: "priyanshu.goel@gmail.com",
    name: "Priyanshu Goel",
    accountId: "712f474e-5049-4593-9b96-f9afe1c4f51b",
  },

  {
    email: "tusharsaxena@gmail.com",
    name: "Tushar Saxena",
    accountId: "ad07f1a2-c0ba-42b7-a91d-508fcfc69222",
  },

  {
    email: "anurag@gmail.com",
    name: "Anurag Arora",
    accountId: "40516354-054e-41c1-a36e-0df93e8eb353",
  },

  {
    email: "john.sharma@gmail.com",
    name: "John Sharma",
    accountId: "335aa66c-2de2-4b16-a885-679ef22ad38a",
  },

  {
    email: "janeverma@gmail.com",
    name: "Jane Verma",
    accountId: "abd21201-42a5-421c-b75e-8ea7a223bdf9",
  },

  {
    email: "yash@gmail.com",
    name: "Yash Gupta",
    accountId: "85403ff5-db37-4d57-8e71-7e79c28445fb",
  },

  {
    email: "abhineeti.agarwal@gmail.com",
    name: "Abhineeti Agarwal",
    accountId: "14d06be6-8ea8-4f49-b6a4-a436e4d8b62f",
  },

  {
    email: "navyasingh@gmail.com",
    name: "Navya Singh",
    accountId: "139c9fa0-bee3-4e23-a480-eb3cabf8f6b2",
  },

  {
    email: "yosha@gmail.com",
    name: "Yosha Yadav",
    accountId: "ae847306-dc82-44cf-97fe-aa26ac552b66",
  },

  {
    email: "jenny.patel@gmail.com",
    name: "Jenny Patel",
    accountId: "4b85db5a-3083-46d0-bd5e-b75e1c8e9889",
  },

  {
    email: "jiajain@gmail.com",
    name: "Jia Jain",
    accountId: "79edbf7d-dc8a-4e96-a915-0f533f2dd510",
  },

  {
    email: "vanshika@gmail.com",
    name: "Vanshika Khanna",
    accountId: "9a4951e8-6d9e-47e7-a4f5-4bf9782faa62",
  },

  {
    email: "aarushi.kapoor@gmail.com",
    name: "Aarushi Kapoor",
    accountId: "9a25308a-be65-471b-9a74-85d9e9f9a341",
  },
];

/*
|--------------------------------------------------------------------------
| K6 OPTIONS
|--------------------------------------------------------------------------
*/

export const options = {
    vus: Number(__ENV.VUS || 5),

    duration: __ENV.DURATION || "30s",

    thresholds: {
        http_req_failed: ["rate<0.05"],
    },
};

/*
|--------------------------------------------------------------------------
| SETUP
|--------------------------------------------------------------------------
|
| setup() runs ONCE before VUs begin.
|
| We authenticate every simulation user here.
|
| This is important because we don't want every VU to repeatedly
| login during the actual payment test.
|
|--------------------------------------------------------------------------
*/

export function setup() {
    console.log("==========================================");
    console.log("SIMULATION SETUP");
    console.log("==========================================");

    console.log(`Users configured : ${USERS.length}`);
    console.log(`Login URL        : ${LOGIN_URL}`);
    console.log(`Payment URL      : ${BASE_URL}/payments`);

    const authenticatedUsers = [];

    /*
     * Authenticate every configured user.
     */
    for (const user of USERS) {
        const payload = JSON.stringify({
            email: user.email,
            password: PASSWORD,
        });

        const response = http.post(
            LOGIN_URL,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                },
            },
        );

        /*
         * Log failed authentication attempts.
         *
         * This makes debugging much easier than silently
         * ignoring authentication failures.
         */
        if (response.status !== 200) {
            console.error(
                `LOGIN FAILED: ${user.email} | HTTP ${response.status}`,
            );

            console.error(
                `Response: ${response.body}`,
            );

            continue;
        }

        try {
            const json = response.json();

            /*
             * Your backend currently returns:
             *
             * {
             *   success: true,
             *   token: "...",
             *   user: {...}
             * }
             *
             * We still support accessToken/data.token in case
             * the authentication response changes later.
             */
            const token =
                json.token ||
                json.accessToken ||
                (
                    json.data &&
                    json.data.token
                );

            if (!token) {
                console.error(
                    `TOKEN NOT FOUND: ${user.email}`,
                );

                console.error(
                    `Response: ${response.body}`,
                );

                continue;
            }

            /*
             * Prefer the accountId returned by the login API.
             *
             * This prevents the simulation from accidentally
             * using a stale/wrong account ID.
             */
            const authenticatedAccountId =
                json.user?.accountId ||
                user.accountId;

            if (!authenticatedAccountId) {
                console.error(
                    `ACCOUNT ID NOT FOUND: ${user.email}`,
                );

                continue;
            }

            authenticatedUsers.push({
                name: user.name,
                email: user.email,
                accountId: authenticatedAccountId,
                token,
            });

            console.log(
                `LOGIN SUCCESS: ${user.email} | Account: ${authenticatedAccountId}`,
            );
        } catch (error) {
            console.error(
                `INVALID LOGIN RESPONSE: ${user.email}`,
            );

            console.error(
                response.body,
            );
        }
    }

    console.log("==========================================");

    console.log(
        `Authenticated ${authenticatedUsers.length}/${USERS.length} users`,
    );

    console.log("==========================================");

    /*
     * We need at least two different wallets.
     */
    if (authenticatedUsers.length < 2) {
        throw new Error(
            `Only ${authenticatedUsers.length}/${USERS.length} simulation users authenticated. At least 2 users are required.`,
        );
    }

    return {
        users: authenticatedUsers,
    };
}

/*
|--------------------------------------------------------------------------
| RANDOM USER
|--------------------------------------------------------------------------
*/

function randomUser(users) {
    return users[
        Math.floor(
            Math.random() * users.length,
        )
    ];
}

/*
|--------------------------------------------------------------------------
| RANDOM AMOUNT
|--------------------------------------------------------------------------
|
| Generates:
|
| ₹1 - ₹100
|
|--------------------------------------------------------------------------
*/

function randomAmount() {
    return (
        Math.floor(
            Math.random() * 100,
        ) + 1
    );
}

/*
|--------------------------------------------------------------------------
| IDEMPOTENCY KEY
|--------------------------------------------------------------------------
|
| Every payment must have a unique idempotency key.
|
| __VU    = current virtual user
| __ITER  = iteration of that VU
| Date    = current timestamp
| Random  = additional uniqueness
|
|--------------------------------------------------------------------------
*/

function idempotencyKey() {
    return (
        `simulation-normal-` +
        `${__VU}-` +
        `${__ITER}-` +
        `${Date.now()}-` +
        `${Math.floor(
            Math.random() * 1000000000,
        )}`
    );
}

/*
|--------------------------------------------------------------------------
| MAIN PAYMENT TEST
|--------------------------------------------------------------------------
*/

export default function (data) {
    const users = data.users;

    /*
     * Select sender.
     */
    const sender = randomUser(users);

    /*
     * Select receiver.
     *
     * Receiver MUST be different from sender.
     *
     * We don't want:
     *
     * Samarth -> Samarth
     *
     * because this isn't a meaningful wallet transfer.
     */
    let receiver = randomUser(users);

    while (
        receiver.accountId === sender.accountId
    ) {
        receiver = randomUser(users);
    }

    /*
     * Payment request.
     */
    const body = {
        toAccountId: receiver.accountId,

        amount: String(
            randomAmount(),
        ),

        transactionType: "TRANSFER",

        lockingStrategy: "PESSIMISTIC",

        idempotencyKey:
            idempotencyKey(),
    };

    /*
     * Send payment.
     */
    const response = http.post(
        `${BASE_URL}/payments`,
        JSON.stringify(body),
        {
            headers: {
                "Content-Type":
                    "application/json",

                /*
                 * IMPORTANT:
                 * Payment is authenticated using
                 * the sender's JWT.
                 */
                token: sender.token,
            },

            tags: {
                endpoint: "payment",
                testType: "normal",
            },
        },
    );

    /*
     |--------------------------------------------------------------------------
     | HTTP RESPONSE CHECK
     |--------------------------------------------------------------------------
     */

    const httpSuccess = check(
        response,
        {
            "payment HTTP 201":
                (r) => r.status === 201,
        },
    );

    /*
     |--------------------------------------------------------------------------
     | RESPONSE BODY CHECK
     |--------------------------------------------------------------------------
     */

    let paymentSuccess = false;
    let transactionId = undefined;

    try {
        const json = response.json();

        transactionId =
            json.transactionId;

        paymentSuccess =
            response.status === 201 &&
            json.status === "SUCCESS";

        check(
            json,
            {
                "transactionId exists":
                    (j) =>
                        j.transactionId !==
                        undefined,

                "payment SUCCESS":
                    (j) =>
                        j.status ===
                        "SUCCESS",
            },
        );
    } catch (error) {
        console.error(
            "Invalid JSON response:",
            response.body,
        );
    }

    /*
     |--------------------------------------------------------------------------
     | LOG ONLY FAILED PAYMENTS
     |--------------------------------------------------------------------------
     |
     | We intentionally don't print successful payments.
     |
     | With 100+ VUs, printing every successful request would
     | flood the console.
     |
     |--------------------------------------------------------------------------
     */

    if (!httpSuccess || !paymentSuccess) {
        console.error(
            "==========================================",
        );

        console.error(
            "SIMULATION PAYMENT FAILED",
        );

        console.error(
            `Sender       : ${sender.name}`,
        );

        console.error(
            `Sender email : ${sender.email}`,
        );

        console.error(
            `Sender acct  : ${sender.accountId}`,
        );

        console.error(
            `Receiver     : ${receiver.name}`,
        );

        console.error(
            `Receiver acct: ${receiver.accountId}`,
        );

        console.error(
            `Amount       : ${body.amount}`,
        );

        console.error(
            `HTTP status  : ${response.status}`,
        );

        console.error(
            `Transaction  : ${transactionId ?? "N/A"}`,
        );

        console.error(
            `Response     : ${response.body}`,
        );

        console.error(
            "==========================================",
        );
    }
}