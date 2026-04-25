import notificationModel from '../models/notification-model.js'

const notificationService = {
    readForScope: async ({ user_id, role }) => {
        const [items, unread_count] = await Promise.all([
            notificationModel.readForScope({ user_id, role }),
            notificationModel.countUnreadForScope({ user_id, role }),
        ])

        return { unread_count, items }
    },

    create: async ({ user_id, role, type, message, created_by }) => {
        if (user_id) {
            const item = await notificationModel.createOne({ user_id, role, type, message, created_by })
            return [item]
        }

        const userIds = await notificationModel.readUserIdsByRole(role)
        if (userIds.length === 0) {
            const err = new Error('No users found for the specified role.')
            err.status = 404
            throw err
        }

        const createdItems = []
        for (const recipientUserId of userIds) {
            createdItems.push(
                await notificationModel.createOne({
                    user_id: recipientUserId,
                    role,
                    type,
                    message,
                    created_by,
                })
            )
        }

        return createdItems
    },

    markRead: async ({ id, user_id, role }) => {
        const notification = await notificationModel.readById(id)
        if (!notification) return null

        const canAccess =
            notification.user_id === user_id ||
            (notification.user_id === null && notification.role === role)

        if (!canAccess) {
            const err = new Error('Not found')
            err.status = 404
            throw err
        }

        return notificationModel.markRead(id)
    },
}

export default notificationService
