import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	plan: {
		users: r.many.user({
			from: r.plan.id.through(r.payment.planId),
			to: r.user.id.through(r.payment.userId)
		}),
		userPaymentsPlanId: r.many.userPayment({
			alias: "userPayment_planId_plan_id"
		}),
		userPaymentsScheduledPlanId: r.many.userPayment({
			alias: "userPayment_scheduledPlanId_plan_id"
		}),
	},
	user: {
		plans: r.many.plan(),
		quizzes: r.many.quiz(),
		userNotifications: r.many.userNotification(),
		userPayments: r.many.userPayment(),
		upLimits: r.many.upLimit(),
	},
	quiz: {
		user: r.one.user({
			from: r.quiz.userId,
			to: r.user.id
		}),
		quizBids: r.many.quizBid(),
		quizContacts: r.many.quizContact(),
		quizFiles: r.many.quizFile(),
		quizOpens: r.many.quizOpen(),
		quizQuestions: r.many.quizQuestion(),
		quizThxPages: r.many.quizThxPage(),
	},
	quizBid: {
		quiz: r.one.quiz({
			from: r.quizBid.quizId,
			to: r.quiz.id
		}),
	},
	quizContact: {
		quiz: r.one.quiz({
			from: r.quizContact.quizId,
			to: r.quiz.id
		}),
	},
	quizFile: {
		quiz: r.one.quiz({
			from: r.quizFile.quizId,
			to: r.quiz.id
		}),
	},
	quizOpen: {
		quiz: r.one.quiz({
			from: r.quizOpen.quizUid,
			to: r.quiz.uid
		}),
	},
	quizQuestion: {
		quiz: r.one.quiz({
			from: r.quizQuestion.quizId,
			to: r.quiz.id
		}),
	},
	quizThxPage: {
		quiz: r.one.quiz({
			from: r.quizThxPage.quizId,
			to: r.quiz.id
		}),
	},
	userNotification: {
		user: r.one.user({
			from: r.userNotification.userId,
			to: r.user.id
		}),
	},
	userPayment: {
		payment: r.one.payment({
			from: r.userPayment.paymentId,
			to: r.payment.id
		}),
		planPlanId: r.one.plan({
			from: r.userPayment.planId,
			to: r.plan.id,
			alias: "userPayment_planId_plan_id"
		}),
		planScheduledPlanId: r.one.plan({
			from: r.userPayment.scheduledPlanId,
			to: r.plan.id,
			alias: "userPayment_scheduledPlanId_plan_id"
		}),
		user: r.one.user({
			from: r.userPayment.userId,
			to: r.user.id
		}),
	},
	payment: {
		userPayments: r.many.userPayment(),
	},
	upLimit: {
		users: r.many.user({
			from: r.upLimit.id.through(r.userPaymentPro.upLimitId),
			to: r.user.id.through(r.userPaymentPro.userId)
		}),
	},
}))