# Tenant Portal API – Notifications

This document reflects the current notifications contract after pagination and bulk read support.

## List Notifications
- **Endpoint**: `GET /api/v1/notifications`
- **Query params**:
  - `page` (default `1`)
  - `limit` (default `20`, max `100`)
  - `unreadOnly` (default `false`) – when `true`, returns only unread rows and `total` reflects unread count.
- **Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Maintenance Request Update",
      "message": "Your work order was updated.",
      "notification_type": "maintenance",
      "is_read": false,
      "read_at": null,
      "created_at": "2025-12-15T18:10:00.000Z",
      "action_url": "/maintenance/123",
      "entity_id": "123",
      "entity_type": "maintenance",
      "user_id": "auth-user-id"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20
}
```
- Notes: RLS-scoped by `user_id`; ordered by `created_at` desc; supports exact counts for pagination badges.

## Mark Notification Read
- **Endpoint**: `PUT /api/v1/notifications/:id/read`
- **Response**: `{ "success": true }`
- Marks a single notification as read for the authenticated user.

## Mark All Notifications Read
- **Endpoint**: `PUT /api/v1/notifications/read-all`
- **Response**: `{ "updated": <number-of-rows-updated> }`
- Sets all unread notifications for the authenticated user to `is_read = true` and populates `read_at`.

## Delete Notification
- **Endpoint**: `DELETE /api/v1/notifications/:id`
- **Response**: `{ "success": true }`
- Deletes a notification owned by the authenticated user.

## Create Maintenance Notification
- **Endpoint**: `POST /api/v1/notifications/maintenance`
- **Body**:
```json
{
  "user_id": "auth-user-id",
  "maintenanceId": "uuid",
  "propertyName": "String",
  "unit_number": "String"
}
```
- **Response**: `{ "notification": <Row> }`
- Creates a maintenance notification with `action_url` pointing to the maintenance request detail page.

## Frontend Parity Notes
- Owner dashboard (`/owner/dashboard/settings`, Notifications tab) now renders paginated in-app notifications using `useNotifications`, `useMarkNotificationRead`, `useDeleteNotification`, and `useMarkAllNotificationsRead`, with action_url navigation.
- Tenant portal (`/tenant/settings/notifications`) exposes All/Unread filters, pagination, mark-read/delete, and bulk mark-all-read using the same hooks.
