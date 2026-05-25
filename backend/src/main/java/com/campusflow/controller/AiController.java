package com.campusflow.controller;

import com.campusflow.dto.ApiResponse;
import com.campusflow.dto.SubdivideResponseDto;
import com.campusflow.dto.TaskListDto;
import com.campusflow.service.AiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * AI 기능을 위한 REST 컨트롤러
 *
 * 역할:
 *   프론트엔드 → 이 컨트롤러 → AiService → Python FastAPI(AI 서버) 순서로 요청이 흐름.
 *   이 컨트롤러는 요청 파싱과 응답 포맷(ApiResponse) 감싸기만 담당하고,
 *   실제 AI 서버 호출 로직은 AiService에 위임함.
 *
 * 제공 기능:
 *   1. /generate-tasks  : 프로젝트 제목+설명 → 카테고리별 태스크 목록 자동 생성
 *   2. /subdivide-task  : 태스크 하나 → 2개의 세부 업무로 분해
 */
@RestController                  // JSON 응답을 반환하는 REST 컨트롤러임을 선언
@RequestMapping("/api/ai")       // 이 컨트롤러의 모든 엔드포인트는 /api/ai 로 시작
@RequiredArgsConstructor         // final 필드(aiService)를 생성자 주입으로 자동 처리 (Lombok)
public class AiController {

    // AiService: 실제 Python AI 서버와 HTTP 통신하는 서비스 레이어
    private final AiService aiService;

    /**
     * [업무 자동 생성] POST /api/ai/generate-tasks
     *
     * 사용 시점: 프로젝트를 처음 만들 때 "AI로 업무 자동 생성" 버튼을 누르면 호출됨.
     *
     * 요청 파라미터 (Query String):
     *   - title       : 프로젝트 제목 (예: "졸업 프로젝트 개발")
     *   - description : 프로젝트 설명 (예: "React + Spring Boot 기반 협업 툴")
     *
     * 처리 흐름:
     *   1. title, description을 AiService로 전달
     *   2. AiService가 Python AI 서버에 요청을 보내 태스크 목록을 받아옴
     *   3. 결과를 TaskListDto(카테고리별 태스크 구조)로 가공해서 반환
     *
     * 응답:
     *   - 성공 200: { status: 200, message: "업무 생성 성공", data: TaskListDto }
     *   - 실패 500: { status: 500, message: "AI 서버 오류: ..." }
     *
     * TaskListDto 구조 예시:
     *   {
     *     "categories": [
     *       { "name": "기획", "tasks": ["요구사항 정리", "와이어프레임 작성"] },
     *       { "name": "개발", "tasks": ["API 설계", "프론트엔드 구현"] }
     *     ]
     *   }
     */
    @PostMapping("/generate-tasks")
    public ResponseEntity<ApiResponse<TaskListDto>> generateTasks(
            @RequestParam("description") String description) {
        try {
            // AiService를 통해 Python AI 서버로부터 태스크 목록을 받아옴
            TaskListDto result = aiService.generateTasks(description);
            // 성공 시 200 OK + ApiResponse 래핑해서 반환
            return ResponseEntity.ok(ApiResponse.success(200, "업무 생성 성공", result));
        } catch (RuntimeException e) {
            // AI 서버 연결 실패, 타임아웃, 파싱 오류 등 모든 런타임 예외를 500으로 처리
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error(500, "AI 서버 오류: " + e.getMessage()));
        }
    }

    /**
     * [업무 세부 분해] POST /api/ai/subdivide-task
     *
     * 사용 시점: 태스크 카드에서 "업무 분해" 버튼을 누르면 호출됨.
     *            하나의 큰 업무를 더 작은 2개의 세부 업무로 쪼개줌.
     *
     * 요청 바디 (JSON):
     *   - task     : 분해할 업무 이름 (예: "API 설계")
     *   - category : 해당 업무의 카테고리 (예: "개발") — AI가 맥락 파악에 사용
     *
     * 처리 흐름:
     *   1. JSON 바디에서 task, category 추출 (없으면 빈 문자열 기본값)
     *   2. AiService를 통해 Python AI 서버에 분해 요청
     *   3. 2개의 세부 업무가 담긴 SubdivideResponseDto 반환
     *
     * 응답:
     *   - 성공 200: { status: 200, message: "분해 성공", data: SubdivideResponseDto }
     *   - 실패 500: { status: 500, message: "AI 서버 오류: ..." }
     *
     * SubdivideResponseDto 구조 예시:
     *   {
     *     "subtasks": ["REST API 엔드포인트 설계", "API 문서 작성 (Swagger)"]
     *   }
     *
     * 참고: @RequestBody Map<String, String>을 쓰는 이유는 바디 필드가 task, category 2개뿐이라
     *       별도 DTO 클래스를 만들지 않고 Map으로 간단하게 받기 위함.
     */
    @PostMapping("/subdivide-task")
    public ResponseEntity<ApiResponse<SubdivideResponseDto>> subdivideTask(@RequestBody Map<String, String> body) {
        // 바디에서 task, category 추출 — 키가 없으면 빈 문자열로 처리
        String task     = body.getOrDefault("task", "");
        String category = body.getOrDefault("category", "");
        try {
            // AiService를 통해 Python AI 서버로부터 분해된 서브태스크 2개를 받아옴
            SubdivideResponseDto result = aiService.subdivideTask(task, category);
            // 성공 시 200 OK + ApiResponse 래핑해서 반환
            return ResponseEntity.ok(ApiResponse.success(200, "분해 성공", result));
        } catch (RuntimeException e) {
            // AI 서버 연결 실패, 타임아웃, 파싱 오류 등 모든 런타임 예외를 500으로 처리
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error(500, "AI 서버 오류: " + e.getMessage()));
        }
    }
}
