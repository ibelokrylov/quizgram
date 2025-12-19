// Relations для всех таблиц используя новый API defineRelations

import { defineRelations } from "drizzle-orm";
import { codeTable } from "./code";
import { planTable } from "./plan";
import {
  quizBidTable,
  quizContactTable,
  quizQuestionTable,
  quizTable,
  quizThxPageTable,
} from "./quiz";
import { quizOpenTable } from "./quiz/quiz-open";
import { userTable } from "./user";
import { userFileTable } from "./user-file";
import { userNotificationTable } from "./user-notification";
import { userPaymentTable } from "./user-payment";

export const relations = defineRelations(
  {
    user: userTable,
    plan: planTable,
    code: codeTable,
    userFile: userFileTable,
    userNotification: userNotificationTable,
    userPayment: userPaymentTable,
    quiz: quizTable,
    quizContact: quizContactTable,
    quizThxPage: quizThxPageTable,
    quizQuestion: quizQuestionTable,
    quizBid: quizBidTable,
    quizOpen: quizOpenTable,
  },
  (r) => ({
    // User relations
    user: {
      plan: r.one.plan({
        from: r.user.planId,
        to: r.plan.id,
      }),
      referral: r.one.user({
        from: r.user.referralId,
        to: r.user.id,
      }),
      quizzes: r.many.quiz({
        from: r.user.id,
        to: r.quiz.userId,
      }),
      codes: r.many.code({
        from: r.user.id,
        to: r.code.userId,
      }),
      userFiles: r.many.userFile({
        from: r.user.id,
        to: r.userFile.userId,
      }),
      notification: r.one.userNotification({
        from: r.user.id,
        to: r.userNotification.userId,
      }),
      payment: r.one.userPayment({
        from: r.user.id,
        to: r.userPayment.userId,
      }),
    },

    // Plan relations
    plan: {
      users: r.many.user({
        from: r.plan.id,
        to: r.user.planId,
      }),
      userPayments: r.many.userPayment({
        from: r.plan.id,
        to: r.userPayment.planId,
      }),
    },

    // Code relations
    code: {
      user: r.one.user({
        from: r.code.userId,
        to: r.user.id,
      }),
    },

    // UserFile relations
    userFile: {
      user: r.one.user({
        from: r.userFile.userId,
        to: r.user.id,
      }),
    },

    // UserNotification relations
    userNotification: {
      user: r.one.user({
        from: r.userNotification.userId,
        to: r.user.id,
      }),
    },

    // UserPayment relations
    userPayment: {
      user: r.one.user({
        from: r.userPayment.userId,
        to: r.user.id,
      }),
      plan: r.one.plan({
        from: r.userPayment.planId,
        to: r.plan.id,
      }),
    },

    // Quiz relations
    quiz: {
      user: r.one.user({
        from: r.quiz.userId,
        to: r.user.id,
      }),
      contacts: r.many.quizContact({
        from: r.quiz.id,
        to: r.quizContact.quizId,
      }),
      thxPage: r.one.quizThxPage({
        from: r.quiz.id,
        to: r.quizThxPage.quizId,
      }),
      questions: r.many.quizQuestion({
        from: r.quiz.id,
        to: r.quizQuestion.quizId,
      }),
      quizOpen: r.one.quizOpen({
        from: r.quiz.uid,
        to: r.quizOpen.quizUid,
      }),
      quizBids: r.many.quizBid({
        from: r.quiz.id,
        to: r.quizBid.quizId,
      }),
    },

    // QuizContact relations
    quizContact: {
      quiz: r.one.quiz({
        from: r.quizContact.quizId,
        to: r.quiz.id,
      }),
    },

    // QuizThxPage relations
    quizThxPage: {
      quiz: r.one.quiz({
        from: r.quizThxPage.quizId,
        to: r.quiz.id,
      }),
    },

    // QuizQuestion relations
    quizQuestion: {
      quiz: r.one.quiz({
        from: r.quizQuestion.quizId,
        to: r.quiz.id,
      }),
    },

    // QuizOpen relations
    quizOpen: {
      quiz: r.one.quiz({
        from: r.quizOpen.quizUid,
        to: r.quiz.uid,
      }),
    },

    // QuizBid relations
    quizBid: {
      quiz: r.one.quiz({
        from: r.quizBid.quizId,
        to: r.quiz.id,
      }),
    },
  }),
);
