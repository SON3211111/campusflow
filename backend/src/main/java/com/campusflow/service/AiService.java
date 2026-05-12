public String getAiRecommendation(AiRecommendationRequest requestDto) {
    AiRequestDto aiRequest = new AiRequestDto(
            requestDto.getTitle() + " : " + requestDto.getDescription()
    );

    try {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<AiRequestDto> entity = new HttpEntity<>(aiRequest, headers);

        // 1. [수정] Map.class 대신 AiResponseDto.class를 사용합니다.
        ResponseEntity<AiResponseDto> response = restTemplate.exchange(
                aiServerUrl + "/generate",
                HttpMethod.POST,
                entity,
                AiResponseDto.class // 응답도 DTO로 매핑!
        );

        // 2. [수정] 응답 처리 로직 최적화
        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            // Record는 .result() 메서드로 바로 접근 가능합니다.
            String result = response.getBody().result();
            return (result != null) ? result : "AI 서버로부터 결과가 오지 않았습니다.";
        }

        return "AI 서버 응답 오류: " + response.getStatusCode();

    } catch (Exception e) {
        log.error("AI 추천 서비스 호출 중 에러 발생: {}", e.getMessage());
        return "AI 추천 서비스를 일시적으로 사용할 수 없습니다.";
    }
}