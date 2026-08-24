import http from "k6/http";
import { check } from "k6";

// =========================================================
// ENVIRONMENT
// =========================================================

const BASE_URL =
    __ENV.BASE_URL || "http://localhost:3000";

const LOGIN_URL =
    __ENV.LOGIN_URL ||
    `${BASE_URL}/api/user/login`;

const PASSWORD = "root@QWERTY1";

// =========================================================
// TEST USERS
// =========================================================

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

// =========================================================
// SPIKE PROFILE
// =========================================================
//
// The traffic deliberately increases:
//
// 5 VUs
//   ↓
// 25 VUs
//   ↓
// 50 VUs
//   ↓
// 100 VUs  ← SPIKE
//   ↓
// 25 VUs
//   ↓
// 5 VUs
//
// =========================================================

export const options = {
    stages: [
        {
            duration: "20s",
            target: 5,
        },

        {
            duration: "20s",
            target: 25,
        },

        {
            duration: "30s",
            target: 50,
        },

        {
            duration: "20s",
            target: 100,
        },

        {
            duration: "20s",
            target: 25,
        },

        {
            duration: "20s",
            target: 5,
        },
    ],

    thresholds: {
        http_req_failed: [
            "rate<0.05",
        ],
    },
};

// =========================================================
// SETUP
// =========================================================

export function setup() {
    console.log(
        "==========================================",
    );

    console.log(
        "SPIKE TEST SETUP",
    );

    console.log(
        "==========================================",
    );

    console.log(
        `Users configured : ${USERS.length}`,
    );

    console.log(
        `Login URL        : ${LOGIN_URL}`,
    );

    console.log(
        `Payment URL      : ${BASE_URL}/payments`,
    );

    console.log(
        "Spike profile    : 5 → 25 → 50 → 100 → 25 → 5 VUs",
    );

    const authenticatedUsers = [];

    // =====================================================
    // AUTHENTICATE USERS ONCE
    // =====================================================

    for (const user of USERS) {
        const payload =
            JSON.stringify({
                email: user.email,
                password: PASSWORD,
            });

        const response =
            http.post(
                LOGIN_URL,
                payload,
                {
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                },
            );

        if (
            response.status !==
            200
        ) {
            console.error(
                `LOGIN FAILED: ${user.email} | HTTP ${response.status}`,
            );

            continue;
        }

        try {
            const json =
                response.json();

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

                continue;
            }

            const accountId =
                json.user?.accountId ||
                user.accountId;

            authenticatedUsers.push({
                name: user.name,
                email: user.email,
                accountId,
                token,
            });

            console.log(
                `LOGIN SUCCESS: ${user.email} | Account: ${accountId}`,
            );
        } catch {
            console.error(
                `INVALID LOGIN RESPONSE: ${user.email}`,
            );
        }
    }

    console.log(
        "==========================================",
    );

    console.log(
        `Authenticated ${authenticatedUsers.length}/${USERS.length} users`,
    );

    console.log(
        "==========================================",
    );

    if (
        authenticatedUsers.length <
        2
    ) {
        throw new Error(
            `Only ${authenticatedUsers.length}/${USERS.length} simulation users authenticated. At least 2 users are required.`,
        );
    }

    return {
        users:
            authenticatedUsers,
    };
}

// =========================================================
// RANDOM USER
// =========================================================

function randomUser(users) {
    return users[
        Math.floor(
            Math.random() *
                users.length,
        )
    ];
}

// =========================================================
// RANDOM AMOUNT
// =========================================================

function randomAmount() {
    return (
        Math.floor(
            Math.random() * 100,
        ) + 1
    );
}

// =========================================================
// UNIQUE IDEMPOTENCY KEY
// =========================================================

function idempotencyKey() {
    return (
        `simulation-spike-` +
        `${__VU}-` +
        `${__ITER}-` +
        `${Date.now()}-` +
        `${Math.floor(
            Math.random() *
                1000000000,
        )}`
    );
}

// =========================================================
// PAYMENT
// =========================================================

export default function (data) {
    const users =
        data.users;

    const sender =
        randomUser(users);

    let receiver =
        randomUser(users);

    // Never transfer to itself.
    while (
        receiver.accountId ===
        sender.accountId
    ) {
        receiver =
            randomUser(users);
    }

    const body = {
        toAccountId:
            receiver.accountId,

        amount:
            String(
                randomAmount(),
            ),

        transactionType:
            "TRANSFER",

        lockingStrategy:
            "PESSIMISTIC",

        idempotencyKey:
            idempotencyKey(),
    };

    const response =
        http.post(
            `${BASE_URL}/payments`,
            JSON.stringify(body),
            {
                headers: {
                    "Content-Type":
                        "application/json",

                    token:
                        sender.token,
                },

                tags: {
                    endpoint:
                        "payment",

                    testType:
                        "spike",
                },
            },
        );

    // =====================================================
    // HTTP CHECK
    // =====================================================

    const httpSuccess =
        check(
            response,
            {
                "payment HTTP 201":
                    (r) =>
                        r.status ===
                        201,
            },
        );

    // =====================================================
    // RESPONSE CHECK
    // =====================================================

    let paymentSuccess =
        false;

    let transactionId;

    try {
        const json =
            response.json();

        transactionId =
            json.transactionId;

        paymentSuccess =
            response.status ===
                201 &&
            json.status ===
                "SUCCESS";

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
    } catch {
        console.error(
            `Invalid JSON response: ${response.body}`,
        );
    }

    // =====================================================
    // FAILED PAYMENT LOGGING
    // =====================================================

    if (
        !httpSuccess ||
        !paymentSuccess
    ) {
        console.error(
            "==========================================",
        );

        console.error(
            "SPIKE TEST PAYMENT FAILED",
        );

        console.error(
            `Sender       : ${sender.name}`,
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
            `Transaction  : ${
                transactionId ??
                "N/A"
            }`,
        );

        console.error(
            `Response     : ${response.body}`,
        );

        console.error(
            "==========================================",
        );
    }
}