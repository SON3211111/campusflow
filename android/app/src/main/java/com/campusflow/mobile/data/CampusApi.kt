package com.campusflow.mobile.data

import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

interface CampusApi {
    @POST("auth/login") suspend fun login(@Body body: Map<String, String>): Envelope<Session>
    @POST("auth/signup") suspend fun signup(@Body body: Map<String, String>): Envelope<Unit>
    @GET("workspaces") suspend fun workspaces(@Query("userId") userId: String): Envelope<List<Workspace>>
    @POST("workspaces") suspend fun createWorkspace(@Query("userId") userId: String, @Body body: Map<String, String>): Envelope<Workspace>
    @GET("workspaces/{id}/members") suspend fun members(@Path("id") id: String): Envelope<List<Member>>
    @GET("workspaces/{id}/tasks") suspend fun tasks(@Path("id") id: String): Envelope<List<Task>>
    @POST("workspaces/{id}/tasks") suspend fun createTask(@Path("id") id: String, @Body body: TaskInput): Envelope<Task>
    @PATCH("workspaces/{id}/tasks/{taskId}/status") suspend fun status(@Path("id") id: String, @Path("taskId") taskId: String, @Query("status") status: String, @Query("userId") userId: String): Envelope<Unit>
    @GET("schedules/{userId}") suspend fun schedules(@Path("userId") userId: String): List<Schedule>
    @POST("schedules") suspend fun addSchedule(@Body body: ScheduleInput): Schedule
    @DELETE("schedules/blocks/{id}") suspend fun deleteSchedule(@Path("id") id: String): retrofit2.Response<Unit>
    @GET("notifications") suspend fun notices(@Query("userId") userId: String): Envelope<List<Notice>>
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
