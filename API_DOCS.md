# API Documentation
> For Flutter Developers

## Base URL
```
http://<your-server-ip>:8000/api/v1
```
> Replace `<your-server-ip>` with `10.0.2.2` for Android emulator, `localhost` for web/iOS simulator.

---

## Standard Response Format
Every API returns this structure:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Some message",
  "data": { }
}
```
On error:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## Authentication
Most APIs require a JWT access token. Send it as:
- **Cookie:** `accessToken=<token>` *(set automatically by server)*
- **Header:** `Authorization: Bearer <token>`

> Store the `accessToken` from login/register response in `flutter_secure_storage`. Attach it to every protected request.

When a `401` is received, call **Refresh Token** to get a new access token silently.

---

## 1. User APIs
**Base:** `/api/v1/user`

---

### Register
`POST /api/v1/user/register`

**Auth required:** No
**Content-Type:** `multipart/form-data`

**Fields:**
| Field | Type | Required |
|---|---|---|
| fullName | String | Yes |
| username | String | Yes |
| email | String | Yes |
| password | String | Yes |
| avatar | File (image) | Yes |
| coverImage | File (image) | No |

**Response `201`:**
```json
{
  "data": {
    "user": {
      "_id": "664abc...",
      "fullName": "John Doe",
      "username": "johndoe",
      "email": "john@example.com",
      "avatar": "https://res.cloudinary.com/...",
      "coverImage": "https://res.cloudinary.com/..."
    },
    "accessToken": "eyJhbGci..."
  }
}
```

---

### Login
`POST /api/v1/user/login`

**Auth required:** No
**Content-Type:** `application/json`

**Body:**
```json
{
  "email": "john@example.com",
  "password": "yourpassword"
}
```

**Response `200`:**
```json
{
  "data": {
    "user": { "_id": "...", "fullName": "...", "username": "...", "avatar": "..." },
    "accessToken": "eyJhbGci..."
  }
}
```

---

### Logout
`POST /api/v1/user/logout`

**Auth required:** Yes

**Response `200`:**
```json
{ "data": {}, "message": "User logged Out successfully" }
```

---

### Refresh Access Token
`POST /api/v1/user/refreshAccessToken`

**Auth required:** No
**Body (optional if using cookies):**
```json
{ "refreshToken": "eyJhbGci..." }
```

**Response `200`:** — new `accessToken` set in cookie.

> Call this when any API returns `401`. Retry the original request after refresh.

---

### Get Current User
`GET /api/v1/user/me`

**Auth required:** Yes

**Response `200`:**
```json
{
  "data": {
    "_id": "664abc...",
    "fullName": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "avatar": "https://...",
    "coverImage": "https://...",
    "watchHistory": []
  }
}
```

---

### Get Channel Profile
`GET /api/v1/user/channel/:username`

**Auth required:** Yes
**Params:** `username` — the channel's username

**Response `200`:**
```json
{
  "data": {
    "fullName": "John Doe",
    "username": "johndoe",
    "avatar": "https://...",
    "coverImage": "https://...",
    "subscribersCount": 120,
    "subscribedToCount": 45,
    "isSubscribed": false
  }
}
```

---

### Get Watch History
`GET /api/v1/user/watchHistory`

**Auth required:** Yes

**Response `200`:**
```json
{
  "data": [
    {
      "_id": "...",
      "title": "My Video",
      "thumbnail": "https://...",
      "duration": 320,
      "views": 1500,
      "owner": { "fullName": "...", "username": "...", "avatar": "..." }
    }
  ]
}
```

---

### Update Password
`PUT /api/v1/user/updatePassword`

**Auth required:** Yes

**Body:**
```json
{
  "password": "oldpassword",
  "newPassword": "newpassword"
}
```

---

### Update User Details
`PUT /api/v1/user/updateUser`

**Auth required:** Yes

**Body:**
```json
{
  "fullName": "New Name",
  "email": "newemail@example.com"
}
```

---

### Update Avatar
`PUT /api/v1/user/updateAvatar`

**Auth required:** Yes
**Content-Type:** `multipart/form-data`

| Field | Type |
|---|---|
| avatar | File (image) |

---

### Update Cover Image
`PUT /api/v1/user/updateUserCoverImage`

**Auth required:** Yes
**Content-Type:** `multipart/form-data`

| Field | Type |
|---|---|
| coverImage | File (image) |

---

## 2. Video APIs
**Base:** `/api/v1/video`

---

### Get All Videos (Feed / Search)
`GET /api/v1/video`

**Auth required:** No

**Query Params:**
| Param | Default | Description |
|---|---|---|
| page | 1 | Page number |
| limit | 10 | Videos per page |
| query | — | Search in title/description |
| sortBy | createdAt | Field to sort by |
| sortType | desc | `asc` or `desc` |
| userId | — | Filter by owner |

**Response `200`:**
```json
{
  "data": {
    "videos": [
      {
        "_id": "...",
        "title": "Cool Video",
        "thumbnail": "https://...",
        "duration": 245,
        "views": 3200,
        "isPublished": true,
        "owner": { "fullName": "...", "username": "...", "avatar": "..." },
        "createdAt": "2024-06-01T..."
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  }
}
```

---

### Upload Video
`POST /api/v1/video/upload`

**Auth required:** Yes
**Content-Type:** `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| title | String | Yes |
| description | String | No |
| videoFile | File (video) | Yes |
| thumbnail | File (image) | Yes |

**Response `201`:** Returns the created video object.

---

### Get Video by ID
`GET /api/v1/video/:videoId`

**Auth required:** No (optional — adds to watch history if logged in)

**Response `200`:** Returns full video object. Also increments `views` by 1.

---

### Get Videos by User
`GET /api/v1/video/user/:userId`

**Auth required:** No

**Query Params:** `page`, `limit`

---

### Update Video
`PUT /api/v1/video/:videoId`

**Auth required:** Yes (must be owner)
**Content-Type:** `multipart/form-data`

| Field | Type |
|---|---|
| title | String |
| description | String |
| thumbnail | File (image) |

---

### Delete Video
`DELETE /api/v1/video/:videoId`

**Auth required:** Yes (must be owner)

---

### Toggle Publish Status
`PATCH /api/v1/video/toggle/publish/:videoId`

**Auth required:** Yes (must be owner)

**Response `200`:**
```json
{ "data": { "isPublished": false } }
```

---

## 3. Subscription APIs
**Base:** `/api/v1/subscription`

All subscription routes **require auth**.

---

### Toggle Subscribe / Unsubscribe
`POST /api/v1/subscription/toggle/:channelId`

**Response `200`:**
```json
{ "data": { "subscribed": true } }
```
> If already subscribed → unsubscribes and returns `"subscribed": false`.

---

### Get Channel Subscribers
`GET /api/v1/subscription/subscribers/:channelId`

**Response `200`:**
```json
{
  "data": {
    "subscribers": [
      { "subscriber": { "fullName": "...", "username": "...", "avatar": "..." } }
    ],
    "count": 42
  }
}
```

---

### Get Subscribed Channels
`GET /api/v1/subscription/subscribed/:subscriberId`

**Response `200`:**
```json
{
  "data": {
    "channels": [
      { "channel": { "fullName": "...", "username": "...", "avatar": "..." } }
    ],
    "count": 10
  }
}
```

---

## 4. Comment APIs
**Base:** `/api/v1/comment`

---

### Get Comments on a Video
`GET /api/v1/comment/:videoId`

**Auth required:** No

**Query Params:** `page`, `limit`

**Response `200`:**
```json
{
  "data": {
    "comments": [
      {
        "_id": "...",
        "content": "Great video!",
        "likesCount": 5,
        "owner": { "fullName": "...", "username": "...", "avatar": "..." },
        "createdAt": "..."
      }
    ],
    "total": 30,
    "page": 1,
    "limit": 10
  }
}
```

---

### Add Comment
`POST /api/v1/comment/:videoId`

**Auth required:** Yes

**Body:**
```json
{ "content": "This is amazing!" }
```

---

### Update Comment
`PUT /api/v1/comment/:commentId`

**Auth required:** Yes (must be owner)

**Body:**
```json
{ "content": "Updated comment text" }
```

---

### Delete Comment
`DELETE /api/v1/comment/:commentId`

**Auth required:** Yes (must be owner)

---

## 5. Like APIs
**Base:** `/api/v1/like`

All like routes **require auth**.

---

### Toggle Like on Video
`POST /api/v1/like/toggle/video/:videoId`

**Response `200`:**
```json
{ "data": { "liked": true, "likesCount": 320 } }
```

---

### Toggle Like on Comment
`POST /api/v1/like/toggle/comment/:commentId`

**Response `200`:**
```json
{ "data": { "liked": true, "likesCount": 12 } }
```

---

### Get Like Count for a Video
`GET /api/v1/like/video/:videoId`

**Response `200`:**
```json
{ "data": { "likesCount": 320, "isLiked": true } }
```

---

### Get All Liked Videos
`GET /api/v1/like/videos`

**Response `200`:** Array of liked video objects.

---

## 6. Playlist APIs
**Base:** `/api/v1/playlist`

---

### Get User's Playlists
`GET /api/v1/playlist/user/:userId`

**Auth required:** No

**Response `200`:** Array of playlists with name, description, video count.

---

### Get Playlist by ID
`GET /api/v1/playlist/:playlistId`

**Auth required:** No

**Response `200`:** Full playlist with populated video details.

---

### Create Playlist
`POST /api/v1/playlist`

**Auth required:** Yes

**Body:**
```json
{
  "name": "My Favourites",
  "description": "Videos I love"
}
```

---

### Update Playlist
`PUT /api/v1/playlist/:playlistId`

**Auth required:** Yes (must be owner)

**Body:**
```json
{ "name": "New Name", "description": "New description" }
```

---

### Delete Playlist
`DELETE /api/v1/playlist/:playlistId`

**Auth required:** Yes (must be owner)

---

### Add Video to Playlist
`POST /api/v1/playlist/add/:videoId/:playlistId`

**Auth required:** Yes (must be owner)

---

### Remove Video from Playlist
`DELETE /api/v1/playlist/remove/:videoId/:playlistId`

**Auth required:** Yes (must be owner)

---

## 7. Community Post APIs
**Base:** `/api/v1/community`

---

### Get Channel's Community Posts
`GET /api/v1/community/channel/:channelId`

**Auth required:** No

**Query Params:** `page`, `limit`

**Response `200`:**
```json
{
  "data": {
    "posts": [
      {
        "_id": "...",
        "type": "text",
        "content": "Hello everyone!",
        "likesCount": 45,
        "owner": { "fullName": "...", "username": "...", "avatar": "..." },
        "createdAt": "..."
      }
    ],
    "total": 20,
    "page": 1,
    "limit": 10
  }
}
```

---

### Get Feed (Subscribed Channels' Posts)
`GET /api/v1/community`

**Auth required:** Yes

**Query Params:** `page`, `limit`

---

### Get Single Post
`GET /api/v1/community/:postId`

**Auth required:** No (optional — shows `isLiked` if logged in)

---

### Create Post — Text
`POST /api/v1/community`

**Auth required:** Yes
**Content-Type:** `application/json`

**Body:**
```json
{
  "type": "text",
  "content": "Just dropped a new video! Go check it out."
}
```

---

### Create Post — Image
`POST /api/v1/community`

**Auth required:** Yes
**Content-Type:** `multipart/form-data`

| Field | Type | Required |
|---|---|---|
| type | String (`"image"`) | Yes |
| content | String | No |
| image | File (image) | Yes |

---

### Create Post — Poll
`POST /api/v1/community`

**Auth required:** Yes
**Content-Type:** `multipart/form-data` or `application/json`

**Body:**
```json
{
  "type": "poll",
  "content": "What should I make next?",
  "pollQuestion": "Pick a topic",
  "pollOptions": ["Flutter Tutorial", "Node.js API", "UI Design Tips"]
}
```

> `pollOptions` must be a JSON array of at least 2 strings.

---

### Update Post
`PUT /api/v1/community/:postId`

**Auth required:** Yes (must be owner)
> Polls **cannot** be edited after creation.

---

### Delete Post
`DELETE /api/v1/community/:postId`

**Auth required:** Yes (must be owner)

---

### Toggle Like on Post
`POST /api/v1/community/like/:postId`

**Auth required:** Yes

**Response `200`:**
```json
{ "data": { "liked": true, "likesCount": 88 } }
```

---

### Vote on Poll
`POST /api/v1/community/poll/vote/:postId/:optionId`

**Auth required:** Yes

> `optionId` is the `_id` of the poll option from the post response.
> Voting again on the same option **removes** your vote.
> Voting on a different option **switches** your vote.

**Response `200`:**
```json
{
  "data": {
    "question": "Pick a topic",
    "options": [
      { "_id": "...", "text": "Flutter Tutorial", "voteCount": 34, "votedByMe": true },
      { "_id": "...", "text": "Node.js API", "voteCount": 21, "votedByMe": false }
    ]
  }
}
```

---

## 8. Dashboard APIs
**Base:** `/api/v1/dashboard`

All dashboard routes **require auth** (your own channel data only).

---

### Get Channel Stats
`GET /api/v1/dashboard/stats`

**Response `200`:**
```json
{
  "data": {
    "totalVideos": 24,
    "totalSubscribers": 1500,
    "totalViews": 98000,
    "totalLikes": 4200
  }
}
```

---

### Get Your Channel's Videos
`GET /api/v1/dashboard/videos`

**Query Params:** `page`, `limit`

**Response `200`:** Array of your videos with `likesCount` included.

---

## Error Codes Reference

| Code | Meaning |
|---|---|
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — token missing or expired |
| 404 | Resource not found |
| 409 | Conflict — duplicate data (email/username taken) |
| 500 | Server error |

---

## Flutter Quick Setup

### 1. Install packages
```yaml
# pubspec.yaml
dependencies:
  dio: ^5.4.0
  flutter_secure_storage: ^9.0.0
```

### 2. Dio instance with auth interceptor
```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiClient {
  static const baseUrl = 'http://10.0.2.2:8000/api/v1';
  final _storage = const FlutterSecureStorage();
  late final Dio dio;

  ApiClient() {
    dio = Dio(BaseOptions(baseUrl: baseUrl));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Try refresh token
          final refreshed = await _refreshToken();
          if (refreshed) {
            // Retry original request
            final token = await _storage.read(key: 'accessToken');
            error.requestOptions.headers['Authorization'] = 'Bearer $token';
            final response = await dio.fetch(error.requestOptions);
            return handler.resolve(response);
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<bool> _refreshToken() async {
    try {
      final res = await Dio().post('$baseUrl/user/refreshAccessToken');
      final token = res.data['data']['accessToken'];
      if (token != null) {
        await _storage.write(key: 'accessToken', value: token);
        return true;
      }
    } catch (_) {}
    return false;
  }
}
```

### 3. Example — Login
```dart
Future<void> login(String email, String password) async {
  final res = await apiClient.dio.post('/user/login', data: {
    'email': email,
    'password': password,
  });
  final token = res.data['data']['accessToken'];
  await storage.write(key: 'accessToken', value: token);
}
```

### 4. Example — Upload Video
```dart
Future<void> uploadVideo(String filePath, String thumbPath, String title) async {
  final formData = FormData.fromMap({
    'title': title,
    'videoFile': await MultipartFile.fromFile(filePath),
    'thumbnail': await MultipartFile.fromFile(thumbPath),
  });
  await apiClient.dio.post('/video/upload', data: formData);
}
```

### 5. Example — Vote on Poll
```dart
Future<void> votePoll(String postId, String optionId) async {
  final res = await apiClient.dio.post('/community/poll/vote/$postId/$optionId');
  final options = res.data['data']['options'];
  // update UI with new vote counts
}
```
