package com.campusflow.controller;

import com.campusflow.dto.TaskListDto;
import com.campusflow.service.AiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AiControllerTest {
    private AiService service;
    private MockMvc mvc;

    @BeforeEach void setup() {
        service = mock(AiService.class);
        mvc = MockMvcBuilders.standaloneSetup(new AiController(service)).build();
    }

    @Test void rejectsNoiseBeforeCallingAi() throws Exception {
        for (String input : List.of("", "앱 만들어", "a".repeat(100), "!".repeat(100), "프로젝트 설명".repeat(1000))) {
            mvc.perform(post("/api/ai/generate-tasks").param("description", input))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("status").value(400));
        }
        verifyNoInteractions(service);
    }

    @Test void acceptsMeaningfulInputAndPreservesResponseContract() throws Exception {
        String input = "대학생을 위한 협업 앱을 개발합니다. 로그인, 시간표와 업무 보드를 구현합니다.";
        when(service.generateTasks(input)).thenReturn(new TaskListDto(List.of(), true));
        mvc.perform(post("/api/ai/generate-tasks").param("description", "  " + input + "  "))
                .andExpect(status().isOk()).andExpect(jsonPath("data.fallback").value(true));
        verify(service).generateTasks(input);
    }
}
