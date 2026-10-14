package com.campusflow.mobile.data

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface CampusApi {
    @Multipart @POST("workspaces/{id}/tasks/{taskId}/attachments") suspend fun uploadAttachment(@Path("id") id: String, @Path("taskId") taskId: String, @Part file: okhttp3.MultipartBody.Part, @Part("uploaderId") userId: okhttp3.RequestBody, @Part("uploaderName") name: okhttp3.RequestBody): Envelope<Attachment>
    @Streaming @GET("workspaces/{id}/tasks/{taskId}/attachments/{fileId}/download") suspend fun downloadAttachment(@Path("id") id: String, @Path("taskId") taskId: String, @Path("fileId") fileId: String): okhttp3.ResponseBody
    @DELETE("workspaces/{id}/tasks/{taskId}/attachments/{fileId}") suspend fun deleteAttachment(@Path("id") id: String, @Path("taskId") taskId: String, @Path("fileId") fileId: String): Envelope<Unit>
    @PATCH("workspaces/{id}/tasks/{taskId}/title") suspend fun title(@Path("id") id: String, @Path("taskId") taskId: String, @Body body: Map<String, String>): Envelope<Unit>
    @DELETE("workspaces/{id}/tasks/{taskId}") suspend fun deleteTask(@Path("id") id: String, @Path("taskId") taskId: String): Envelope<Unit>
    @GET("workspaces/{id}/tasks/trash") suspend fun trash(@Path("id") id: String): Envelope<List<Task>>
    @PATCH("workspaces/{id}/tasks/{taskId}/restore") suspend fun restoreTask(@Path("id") id: String, @Path("taskId") taskId: String): Envelope<Task>

    @GET("auth/search") suspend fun findUser(@Query("email") email: String): Envelope<Profile>
    @POST("invitations") suspend fun invite(@Query("inviterId") inviterId: String, @Query("inviteeId") inviteeId: String, @Query("workspaceId") workspaceId: String): Envelope<Unit>
    @GET("invitations") suspend fun invitations(@Query("userId") userId: String): Envelope<List<Invitation>>
    @POST("invitations/{id}/accept") suspend fun acceptInvitation(@Path("id") id: String): Envelope<Unit>
    @POST("invitations/{id}/reject") suspend fun rejectInvitation(@Path("id") id: String): Envelope<Unit>
    @POST("workspaces/{id}/request-join") suspend fun requestJoin(@Path("id") id: String, @Query("userId") userId: String): Envelope<Unit>
    @POST("workspaces/join-requests/{id}/accept") suspend fun acceptJoin(@Path("id") id: String): Envelope<Unit>
    @POST("workspaces/join-requests/{id}/reject") suspend fun rejectJoin(@Path("id") id: String): Envelope<Unit>

    @GET("workspaces/{id}/tasks/bottleneck-report") suspend fun bottleneckReport(@Path("id") id: String, @Query("days") days: Int = 3): Envelope<BottleneckReport>
    @POST("auth/email/send") suspend fun sendEmailCode(@Body body: Map<String, String>): Envelope<Unit>
    @POST("auth/email/verify") suspend fun verifyEmailCode(@Body body: Map<String, String>): Envelope<Map<String, String>>
    @POST("auth/login") suspend fun login(@Body body: Map<String, String>): Envelope<Session>
    @POST("auth/signup") suspend fun signup(@Body body: Map<String, String>): Envelope<Unit>
    @GET("workspaces") suspend fun workspaces(@Query("userId") userId: String): Envelope<List<Workspace>>
    @POST("workspaces") suspend fun createWorkspace(@Query("userId") userId: String, @Body body: Map<String, String>): Envelope<Workspace>
    @GET("workspaces/{id}/members") suspend fun members(@Path("id") id: String): Envelope<List<Member>>
    @GET("workspaces/{id}/tasks") suspend fun tasks(@Path("id") id: String): Envelope<List<Task>>
    @POST("workspaces/{id}/tasks") suspend fun createTask(@Path("id") id: String, @Body body: TaskInput): Envelope<Task>
    @PATCH("workspaces/{id}/tasks/{taskId}/status") suspend fun status(@Path("id") id: String, @Path("taskId") taskId: String, @Query("status") status: String, @Query("userId") userId: String): Envelope<Task>
    @PATCH("workspaces/{id}/tasks/{taskId}/description") suspend fun description(@Path("id") id: String, @Path("taskId") taskId: String, @Body body: Map<String, String>): Envelope<Unit>
    @PATCH("workspaces/{id}/tasks/{taskId}/start-date") suspend fun startDate(@Path("id") id: String, @Path("taskId") taskId: String, @Query("startDate") startDate: String): Envelope<Unit>
    @PATCH("workspaces/{id}/tasks/{taskId}/due-date") suspend fun dueDate(@Path("id") id: String, @Path("taskId") taskId: String, @Query("dueDate") dueDate: String): Envelope<Unit>
    @PATCH("workspaces/{id}/tasks/{taskId}/assignee") suspend fun assignee(@Path("id") id: String, @Path("taskId") taskId: String, @Query("assigneeId") assigneeId: String?): Envelope<Task>
    @PATCH("workspaces/{id}/tasks/{taskId}/quick-signal") suspend fun quickSignal(@Path("id") id: String, @Path("taskId") taskId: String, @Query("signal") signal: String, @Query("userId") userId: String): Envelope<Unit>
    @DELETE("workspaces/{id}/tasks/{taskId}/quick-signal") suspend fun clearQuickSignal(@Path("id") id: String, @Path("taskId") taskId: String): Envelope<Unit>
    @GET("workspaces/{id}/tasks/{taskId}/comments") suspend fun comments(@Path("id") id: String, @Path("taskId") taskId: String): Envelope<List<Comment>>
    @POST("workspaces/{id}/tasks/{taskId}/comments") suspend fun addComment(@Path("id") id: String, @Path("taskId") taskId: String, @Body body: Map<String, String>): Envelope<Comment>
    @GET("workspaces/{id}/tasks/{taskId}/attachments") suspend fun attachments(@Path("id") id: String, @Path("taskId") taskId: String): Envelope<List<Attachment>>
    @GET("schedules/{userId}") suspend fun schedules(@Path("userId") userId: String): List<Schedule>
    @POST("schedules") suspend fun addSchedule(@Body body: ScheduleInput): Schedule
    @DELETE("schedules/blocks/{id}") suspend fun deleteSchedule(@Path("id") id: String): retrofit2.Response<Unit>
    @GET("notifications") suspend fun notices(@Query("userId") userId: String, @Query("workspaceId") workspaceId: String? = null): Envelope<List<Notice>>
    @POST("notifications/{id}/read") suspend fun readNotice(@Path("id") id: String): Envelope<Unit>
    @POST("ai/generate-tasks") suspend fun generate(@Query("description") description: String): Envelope<AiResult>
    @GET("users/{id}") suspend fun profile(@Path("id") id: String): Envelope<Profile>
    @PATCH("users/{id}") suspend fun updateProfile(@Path("id") id: String, @Body body: Map<String, String>): Envelope<Profile>

    companion object {
        fun create(baseUrl: String, token: () -> String?): CampusApi {
            val client = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(370, TimeUnit.SECONDS)
                .callTimeout(390, TimeUnit.SECONDS)
                .addInterceptor { chain ->
                    val request = chain.request().newBuilder()
                    token()?.takeIf { it.isNotBlank() }?.let { request.header("Authorization", "Bearer $it") }
                    chain.proceed(request.build())
                }.build()
            return Retrofit.Builder().baseUrl(baseUrl).client(client)
                .addConverterFactory(GsonConverterFactory.create()).build().create(CampusApi::class.java)
        }
    }
}
