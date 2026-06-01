package com.campusflow.service;

import com.campusflow.dto.CommunityCommentRequest;
import com.campusflow.dto.CommunityPostRequest;
import com.campusflow.dto.CommunityPostResponse;
import com.campusflow.entity.*;
import com.campusflow.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Transactional
public class CommunityService {

    private final CommunityPostRepository communityPostRepository;
    private final CommunityCommentRepository communityCommentRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final NotificationRepository notificationRepository;

    // 1. 도움 요청 글 생성 (출처 워크스페이스 지정)
    public void createPost(CommunityPostRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));
        Workspace workspace = workspaceRepository.findById(request.getWorkspaceId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 워크스페이스입니다."));

        CommunityPost post = CommunityPost.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .author(user)
                .workspace(workspace)
                .build();

        communityPostRepository.save(post);
        sendMentionNotifications(request.getContent(), request.getWorkspaceId(), user.getName());
    }

    // 2. 전체 광장 도움 요청 모아보기 조회 (최신 등록순)
    @Transactional(readOnly = true)
    public List<CommunityPostResponse> getAllPosts() {
        return communityPostRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(p -> new CommunityPostResponse(
                        p.getPostId(), p.getTitle(), p.getContent(),
                        p.getAuthor().getUserId(), p.getAuthor().getName(),
                        p.getWorkspace().getName(), p.isSolved(), p.getCreatedAt(), null))
                .toList();
    }

    // 3. 단건 상세 조회 (★댓글 속에 대댓글이 포함되는 트리 구조 조립)
    @Transactional(readOnly = true)
    public CommunityPostResponse getPostDetail(String postId) {
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("해당 도움 요청 글이 존재하지 않습니다."));

        // 부모 댓글(parent == null)인 최상위 코멘트들만 1차 매핑
        List<CommunityPostResponse.CommentDetail> comments = post.getComments().stream()
                .filter(c -> c.getParent() == null)
                .map(c -> {
                    // 각 부모 댓글 아래에 달린 대댓글(Replies)을 List DTO로 가공
                    List<CommunityPostResponse.ReplyDetail> replies = c.getReplies().stream()
                            .map(r -> new CommunityPostResponse.ReplyDetail(
                                    r.getCommentId(), r.getContent(), r.getHelper().getName(), r.getCreatedAt()))
                            .toList();

                    return new CommunityPostResponse.CommentDetail(
                            c.getCommentId(), c.getContent(), c.getHelper().getName(), c.isAdopted(), c.getCreatedAt(), replies);
                })
                .toList();

        return new CommunityPostResponse(
                post.getPostId(), post.getTitle(), post.getContent(),
                post.getAuthor().getUserId(), post.getAuthor().getName(),
                post.getWorkspace().getName(), post.isSolved(), post.getCreatedAt(), comments
        );
    }

    // 4. 도움 요청 글 수정
    public void updatePost(String postId, String title, String content) {
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("해당 글이 없습니다."));
        if (title != null && !title.isBlank()) post.setTitle(title);
        if (content != null && !content.isBlank()) post.setContent(content);
        communityPostRepository.save(post);
    }

    // 4-1. 도움 요청 글 해결 처리
    public void solvePost(String postId) {
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("해당 글이 없습니다."));
        post.setSolved(true);
        communityPostRepository.save(post);
    }

    // 4-2. 도움 요청 글 삭제 (CASCADE 조건에 의해 DB 내 연관 댓글/대댓글 일괄 연쇄 삭제)
    public void deletePost(String postId) {
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("해당 글이 없습니다."));
        communityPostRepository.delete(post);
    }

    // 5. 댓글 및 대댓글 작성 공용 로직
    public void addComment(String postId, CommunityCommentRequest request) {
        CommunityPost post = communityPostRepository.findById(postId)
                .orElseThrow(() -> new IllegalArgumentException("해당 글이 없습니다."));
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 유저입니다."));

        CommunityComment.CommunityCommentBuilder commentBuilder = CommunityComment.builder()
                .content(request.getContent())
                .post(post)
                .helper(user);

        // 만약 parentCommentId가 넘어온 요청이라면 '대댓글' 객체로 빌드
        if (request.getParentCommentId() != null && !request.getParentCommentId().isEmpty()) {
            CommunityComment parentComment = communityCommentRepository.findById(request.getParentCommentId())
                    .orElseThrow(() -> new IllegalArgumentException("부모 댓글을 찾을 수 없습니다."));
            commentBuilder.parent(parentComment);
        }

        communityCommentRepository.save(commentBuilder.build());
        sendMentionNotifications(request.getContent(), post.getWorkspace().getWorkspaceId(), user.getName());
    }

    // 멘션(@이름) 감지 → 워크스페이스 멤버인 경우에만 알림 생성
    private void sendMentionNotifications(String content, String workspaceId, String senderName) {
        Pattern pattern = Pattern.compile("@([\\w가-힣]+)");
        Matcher matcher = pattern.matcher(content);
        List<WorkspaceMember> members = workspaceMemberRepository.findAllByWorkspace_WorkspaceId(workspaceId);
        while (matcher.find()) {
            String mentionedName = matcher.group(1);
            members.stream()
                .filter(m -> m.getUser().getName().equals(mentionedName))
                .findFirst()
                .ifPresent(m -> notificationRepository.save(
                    Notification.builder()
                        .userId(m.getUser().getUserId())
                        .message(senderName + "님이 커뮤니티에서 @" + mentionedName + " 님을 멘션했습니다.")
                        .build()
                ));
        }
    }

    // 6. 댓글 또는 대댓글 개별 삭제 (부모 댓글 지우면 소속 대댓글도 함께 CASCADE 탈락)
    public void deleteComment(String commentId) {
        CommunityComment comment = communityCommentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("해당 댓글이 존재하지 않습니다."));
        communityCommentRepository.delete(comment);
    }
}