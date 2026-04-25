import dashboardMetricsModel from '../models/dashboard-metrics-model.js'

const percentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Number((((current - previous) / previous) * 100).toFixed(2))
}

const dashboardMetricsService = {
    readMetrics: async ({ range }) => {
        const months = range === '12m' ? 12 : 6

        const [
            totalEmployees,
            joinedThisMonth,
            joinedPreviousMonth,
            presentToday,
            onLeaveToday,
            leaveCounts,
            attendanceTrend,
            headcountTrend,
        ] = await Promise.all([
            dashboardMetricsModel.countEmployees(),
            dashboardMetricsModel.countJoinedInMonth({ monthOffset: 0 }),
            dashboardMetricsModel.countJoinedInMonth({ monthOffset: -1 }),
            dashboardMetricsModel.countPresentToday(),
            dashboardMetricsModel.countOnLeaveToday(),
            dashboardMetricsModel.countLeaveRequestsByStatus(),
            dashboardMetricsModel.readMonthlyAttendanceTrend({ months }),
            dashboardMetricsModel.readMonthlyHeadcountTrend({ months }),
        ])

        return {
            range,
            metrics: {
                total_employees: totalEmployees,
                new_joined_this_month: joinedThisMonth,
                employee_change_pct: percentChange(joinedThisMonth, joinedPreviousMonth),
                present_today: presentToday,
                present_pct: totalEmployees > 0 ? Number(((presentToday / totalEmployees) * 100).toFixed(2)) : 0,
                on_leave_today: onLeaveToday,
                pending_leave_count: leaveCounts.pending ?? 0,
                approved_leave_count: leaveCounts.approved ?? 0,
                penalties: {
                    coming_soon: true,
                    count: 0,
                    amount_pkr: 0,
                },
            },
            charts: {
                attendance: attendanceTrend,
                headcount: headcountTrend,
            },
        }
    },
}

export default dashboardMetricsService
