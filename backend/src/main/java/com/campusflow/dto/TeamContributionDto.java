package com.campusflow.dto;

import java.util.List;

/**
 * 팀원별 기여도 데이터 (Bar Chart용)
 */
public record TeamContributionDto(
        List<MemberMetric> metrics
) {
    public record MemberMetric(
            String userId,
            String userName,
            int completedCount, // 완료한 태스크 수
            int issueCount      // 발생/해결한 이슈 수
    ) {}
}