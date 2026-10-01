package com.campusflow.mobile

import com.campusflow.mobile.data.*
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ApiContractTest {
    private lateinit var server: MockWebServer
    private lateinit var api: CampusApi
    @Before fun setup() { server = MockWebServer(); server.start(); api = CampusApi.create(server.url("/api/").toString()) { "test-token" } }
    @After fun teardown() { server.shutdown() }
    private fun json(body: String) { server.enqueue(MockResponse().setHeader("Content-Type", "application/json").setBody(body)) }

    @Test fun loginUnwrapsActualBackendEnvelopeAndSendsEmail() = runTest {
        json("""{"status":200,"message":"OK","data":{"accessToken":"jwt","userId":"u1","name":"학생","role":"STUDENT"}}""")
        assertEquals("u1", api.login(mapOf("email" to "a@b.com", "password" to "password")).value().userId)
        val request = server.takeRequest()
        assertEquals("/api/auth/login", request.path)
        assertTrue(request.body.readUtf8().contains("a@b.com"))
    }
    @Test fun schedulesAreRawArraysUnlikeOtherEndpoints() = runTest {
        json("""[{"blockId":"b1","category":"CLASS","title":"수업","dayOfWeek":"월","startTime":"09:00:00","endTime":"10:00:00"}]""")
        assertEquals("월", api.schedules("u1").single().dayOfWeek)
        assertEquals("Bearer test-token", server.takeRequest().getHeader("Authorization"))
    }
    @Test fun statusUsesPatchQueryAndPermitsNullData() = runTest {
        json("""{"status":200,"message":"OK","data":null}""")
        api.status("ws1", "t1", "DONE", "u1")
        val request = server.takeRequest()
        assertEquals("PATCH", request.method)
        assertEquals("/api/workspaces/ws1/tasks/t1/status?status=DONE&userId=u1", request.path)
    }
    @Test fun aiUsesQueryParameterAndPreservesFallbackFlag() = runTest {
        json("""{"status":200,"message":"OK","data":{"tasks":[{"title":"API 설계","description":"설계","category":"개발","priority":"HIGH","estimatedHours":3}],"fallback":true}}""")
        val result = api.generate("목표 & 기능").value()
        assertTrue(result.fallback)
        assertEquals(3, result.tasks.single().estimatedHours)
        assertEquals("목표 & 기능", server.takeRequest().requestUrl!!.queryParameter("description"))
    }
    @Test fun taskCreationSendsBackendFieldNames() = runTest {
        json("""{"status":200,"message":"OK","data":{"taskId":"t1","title":"업무","status":"REVIEW"}}""")
        api.createTask("ws1", TaskInput("업무", dueDate = "2026-10-15", assigneeId = "u1"))
        val body = com.google.gson.JsonParser.parseString(server.takeRequest().body.readUtf8()).asJsonObject
        assertEquals("u1", body["assigneeId"].asString)
        assertEquals("2026-10-15", body["dueDate"].asString)
        assertEquals("REVIEW", body["status"].asString)
    }
    @Test fun failedHttpResponseDoesNotBecomeDemoData() = runTest {
        server.enqueue(MockResponse().setResponseCode(503).setBody("server down"))
        assertTrue(runCatching { api.tasks("ws1") }.exceptionOrNull() is retrofit2.HttpException)
    }
}
