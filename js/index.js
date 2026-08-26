// ============================================================
// Footballer - 球员排行榜
// 评分 + 评论系统
//
// 功能：
// 1. 评分必须填写
// 2. 评论可以为空
// 3. 当天评论可以覆盖
// 4. 不修改以前日期的评论
// 5. 不能评价自己
// ============================================================


// ============================================================
// 1. 检查登录状态
// ============================================================

const loginUserData =
    localStorage.getItem("loginUser");


if (!loginUserData) {

    window.location.href = "login.html";

    throw new Error("用户未登录");

}


let loginUser;


try {

    loginUser =
        JSON.parse(loginUserData);

} catch (error) {

    console.error(
        "登录信息解析失败：",
        error
    );

    localStorage.removeItem(
        "loginUser"
    );

    window.location.href =
        "login.html";

    throw new Error(
        "登录信息错误"
    );

}


// ============================================================
// 2. 检查 Supabase
// ============================================================

if (
    typeof supabaseClient ===
    "undefined"
) {

    console.error(
        "supabaseClient 不存在，请检查 js/supabase.js"
    );

    throw new Error(
        "Supabase 初始化失败"
    );

}


// ============================================================
// 3. 页面元素
// ============================================================

const currentUserName =
    document.getElementById(
        "currentUserName"
    );


const currentUserAvatar =
    document.getElementById(
        "currentUserAvatar"
    );


const playerCount =
    document.getElementById(
        "playerCount"
    );


const rankingList =
    document.getElementById(
        "rankingList"
    );


const loading =
    document.getElementById(
        "loading"
    );


const refreshButton =
    document.getElementById(
        "refreshButton"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


// ============================================================
// 4. 弹窗元素
// ============================================================

const ratingModal =
    document.getElementById(
        "ratingModal"
    );


const closeModal =
    document.getElementById(
        "closeModal"
    );


const ratingPlayerName =
    document.getElementById(
        "ratingPlayerName"
    );


const scoreRange =
    document.getElementById(
        "scoreRange"
    );


const scoreValue =
    document.getElementById(
        "scoreValue"
    );


const commentInput =
    document.getElementById(
        "commentInput"
    );


const commentLength =
    document.getElementById(
        "commentLength"
    );


const submitRating =
    document.getElementById(
        "submitRating"
    );


// ============================================================
// 5. 当前选择球员
// ============================================================

let selectedPlayerId = null;


// ============================================================
// 6. 评论缓存
// ============================================================

let commentsByPlayer = {};


// ============================================================
// 7. 用户姓名缓存
// ============================================================

let userNameMap = {};


// ============================================================
// 8. 展开的评论
// ============================================================

const expandedComments =
    new Set();


// ============================================================
// 9. 当前用户
// ============================================================

currentUserName.textContent =
    loginUser.name || "用户";


currentUserAvatar.textContent =
    getInitial(
        loginUser.name
    );


// ============================================================
// 10. 初始化
// ============================================================

async function initializePage() {

    console.log(
        "Footballer 页面初始化..."
    );

    await loadRanking();

}


// ============================================================
// 11. 加载排行榜
// ============================================================

async function loadRanking() {

    console.log(
        "开始加载排行榜..."
    );


    loading.style.display =
        "flex";


    loading.innerHTML = `

        <div class="loading-spinner"></div>

        <p>
            正在加载球员数据...
        </p>

    `;


    rankingList.innerHTML =
        "";


    refreshButton.disabled =
        true;


    try {

        // ====================================================
        // 获取排行榜
        // ====================================================

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_player_ranking"
                );


        if (error) {

            console.error(
                "排行榜错误：",
                error
            );


            loading.innerHTML = `

                <p style="color:#ff6b6b;">
                    排行榜加载失败
                </p>

                <p style="
                    margin-top:8px;
                    font-size:11px;
                    color:#65736a;
                ">
                    ${escapeHTML(
                error.message
            )}
                </p>

            `;

            return;

        }


        console.log(
            "排行榜数据：",
            data
        );


        // ====================================================
        // 加载评论
        // ====================================================

        await loadComments();


        // ====================================================
        // 隐藏加载
        // ====================================================

        loading.style.display =
            "none";


        // ====================================================
        // 没有球员
        // ====================================================

        if (
            !data ||
            data.length === 0
        ) {

            playerCount.textContent =
                "0";


            rankingList.innerHTML = `

                <div class="loading">

                    <p>
                        暂时还没有用户
                    </p>

                </div>

            `;

            return;

        }


        // ====================================================
        // 球员数量
        // ====================================================

        playerCount.textContent =
            data.length;


        // ====================================================
        // 创建球员
        // ====================================================

        data.forEach(
            (
                player,
                index
            ) => {

                createPlayer(
                    player,
                    index
                );

            }
        );


    } catch (error) {

        console.error(
            "排行榜系统错误：",
            error
        );


        loading.innerHTML = `

            <p style="color:#ff6b6b;">
                网络连接失败，请稍后再试
            </p>

        `;


    } finally {

        refreshButton.disabled =
            false;

    }

}


// ============================================================
// 12. 加载评论
// ============================================================

async function loadComments() {

    console.log(
        "开始加载评论..."
    );


    commentsByPlayer = {};


    try {

        const {
            data: comments,
            error: commentsError
        } =
            await supabaseClient
                .from("comments")
                .select(
                    `
                    id,
                    target_id,
                    user_id,
                    content,
                    created_at
                    `
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (commentsError) {

            console.error(
                "评论加载失败：",
                commentsError
            );

            commentsByPlayer = {};

            return;

        }


        console.log(
            "评论数据：",
            comments
        );


        await loadCommentUserNames(
            comments || []
        );


        // ====================================================
        // 分类
        // ====================================================

        (comments || []).forEach(
            comment => {

                const targetId =
                    Number(
                        comment.target_id
                    );


                if (
                    !commentsByPlayer[
                        targetId
                        ]
                ) {

                    commentsByPlayer[
                        targetId
                        ] = [];

                }


                commentsByPlayer[
                    targetId
                    ].push(
                    comment
                );

            }
        );


    } catch (error) {

        console.error(
            "评论系统加载错误：",
            error
        );


        commentsByPlayer = {};

    }

}


// ============================================================
// 13. 加载评论作者
// ============================================================

async function loadCommentUserNames(
    comments
) {

    userNameMap = {};


    if (
        !comments ||
        comments.length === 0
    ) {

        return;

    }


    const userIds =
        [
            ...new Set(
                comments.map(
                    comment =>
                        Number(
                            comment.user_id
                        )
                )
            )
        ];


    if (
        userIds.length === 0
    ) {

        return;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("user")
                .select(
                    "id,name"
                )
                .in(
                    "id",
                    userIds
                );


        if (error) {

            console.error(
                "评论作者加载失败：",
                error
            );

            return;

        }


        (data || []).forEach(
            user => {

                userNameMap[
                    Number(user.id)
                    ] =
                    user.name ||
                    "用户";

            }
        );


    } catch (error) {

        console.error(
            "获取评论作者异常：",
            error
        );

    }

}


// ============================================================
// 14. 创建球员
// ============================================================

function createPlayer(
    player,
    index
) {

    const element =
        document.createElement(
            "div"
        );


    element.className =
        "player";


    const playerId =
        Number(player.id);


    const isSelf =
        playerId ===
        Number(loginUser.id);


    const ratingCount =
        Number(
            player.rating_count || 0
        );


    const averageScore =
        player.average_score === null ||
        player.average_score === undefined
            ? null
            : Number(
                player.average_score
            );


    // ========================================================
    // 平均分
    // ========================================================

    let scoreHTML;


    if (
        ratingCount === 0 ||
        averageScore === null ||
        Number.isNaN(
            averageScore
        )
    ) {

        scoreHTML = `

            <div class="score-number no-score">
                暂无
            </div>

        `;

    } else {

        scoreHTML = `

            <div class="score-number">
                ${averageScore.toFixed(2)}
            </div>

        `;

    }


    // ========================================================
    // 操作
    // ========================================================

    let actionHTML;


    if (isSelf) {

        actionHTML = `

            <div class="self-label">
                这是你自己
            </div>

        `;

    } else {

        actionHTML = `

            <button
                    type="button"
                    class="rate-button"
                    data-id="${playerId}">

                ⭐ 给TA评分

            </button>

        `;

    }


    // ========================================================
    // 评论
    // ========================================================

    const commentsHTML =
        createCommentsSection(
            playerId,
            isSelf
        );


    // ========================================================
    // HTML
    // ========================================================

    element.innerHTML = `

        <div class="player-main">


            <div class="rank">
                #${index + 1}
            </div>


            <div class="player-info">

                <div class="avatar">

                    ${getInitial(
        player.name
    )}

                </div>


                <div>

                    <div class="player-name">

                        ${escapeHTML(
        player.name
    )}

                    </div>


                    <div class="player-account">

                        @${escapeHTML(
        player.username
    )}

                    </div>

                </div>

            </div>


            <div class="score">

                ${scoreHTML}

                <div class="score-label">
                    平均评分
                </div>

            </div>


            <div class="player-action">

                <div class="rating-count">

                    ${ratingCount} 人评分

                </div>

                ${actionHTML}

            </div>


        </div>


        ${commentsHTML}

    `;


    rankingList.appendChild(
        element
    );


    // ========================================================
    // 评分按钮
    // ========================================================

    if (!isSelf) {

        const button =
            element.querySelector(
                ".rate-button"
            );


        if (button) {

            button.addEventListener(
                "click",
                function () {

                    openRatingModal(
                        playerId,
                        player.name
                    );

                }
            );

        }

    }


    // ========================================================
    // 评论展开
    // ========================================================

    const showCommentsButton =
        element.querySelector(
            ".show-comments-button"
        );


    if (
        showCommentsButton
    ) {

        showCommentsButton.addEventListener(
            "click",
            function () {

                toggleComments(
                    playerId
                );

            }
        );

    }

}


// ============================================================
// 15. 创建评论区域
// ============================================================

function createCommentsSection(
    playerId,
    isSelf
) {

    const comments =
        commentsByPlayer[
            playerId
            ] || [];


    const isExpanded =
        expandedComments.has(
            playerId
        );


    // ========================================================
    // 没有评论
    // ========================================================

    if (
        comments.length === 0
    ) {

        return `

            <div
                    class="player-comments"
                    data-player-id="${playerId}">

                <div class="comments-header">

                    <div class="comments-title">
                        💬 评论
                    </div>

                    <div class="comments-count">
                        0 条评论
                    </div>

                </div>


                <div class="comments-empty">
                    暂时还没有评论
                </div>


                ${
            isSelf
                ? `
                            <div class="comment-self-tip">
                                这是你自己，不能评价自己
                            </div>
                        `
                : `
                            <div class="comment-action-tip">
                                ⭐ 评分时可以同时留下评价
                            </div>
                        `
        }

            </div>

        `;

    }


    const commentCount =
        comments.length;


    const displayComments =
        isExpanded
            ? comments
            : comments.slice(
                0,
                1
            );


    let commentsListHTML =
        "";


    displayComments.forEach(
        comment => {

            commentsListHTML +=
                createCommentHTML(
                    comment
                );

        }
    );


    let showButtonHTML =
        "";


    if (
        commentCount > 1
    ) {

        showButtonHTML = `

            <button
                    type="button"
                    class="show-comments-button">

                ${
            isExpanded
                ? "收起评论"
                : `查看全部 ${commentCount} 条评论`
        }

            </button>

        `;

    }


    return `

        <div
                class="player-comments"
                data-player-id="${playerId}">


            <div class="comments-header">

                <div class="comments-title">
                    💬 评论
                </div>

                <div class="comments-count">

                    ${commentCount} 条评论

                </div>

            </div>


            <div class="comments-list">

                ${commentsListHTML}

            </div>


            ${showButtonHTML}


            ${
        isSelf
            ? `
                        <div class="comment-self-tip">

                            这是你自己，不能评价自己

                        </div>
                    `
            : `
                        <div class="comment-action-tip">

                            ⭐ 评分时可以同时留下评价

                        </div>
                    `
    }

        </div>

    `;

}


// ============================================================
// 16. 创建评论
// ============================================================

function createCommentHTML(
    comment
) {

    const userId =
        Number(
            comment.user_id
        );


    const isCurrentUser =
        userId ===
        Number(loginUser.id);


    const userName =
        userNameMap[userId] ||
        (
            isCurrentUser
                ? loginUser.name
                : "用户"
        );


    const initial =
        getInitial(
            userName
        );


    const content =
        escapeHTML(
            comment.content
        );


    const time =
        formatCommentTime(
            comment.created_at
        );


    return `

        <div class="comment-item">


            <div class="comment-avatar">

                ${initial}

            </div>


            <div class="comment-body">


                <div class="comment-top">

                    <span class="comment-user">

                        ${escapeHTML(
        userName
    )}

                        ${
        isCurrentUser
            ? `
                                    <span class="comment-you">
                                        你
                                    </span>
                                  `
            : ""
    }

                    </span>


                    <span class="comment-time">

                        ${time}

                    </span>

                </div>


                <div class="comment-content">

                    ${content}

                </div>


            </div>

        </div>

    `;

}


// ============================================================
// 17. 展开评论
// ============================================================

function toggleComments(
    playerId
) {

    if (
        expandedComments.has(
            playerId
        )
    ) {

        expandedComments.delete(
            playerId
        );

    } else {

        expandedComments.add(
            playerId
        );

    }


    redrawRanking();

}


// ============================================================
// 18. 重新绘制排行榜
// ============================================================

async function redrawRanking() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .rpc(
                    "get_player_ranking"
                );


        if (error) {

            console.error(
                "重新绘制排行榜失败：",
                error
            );

            return;

        }


        rankingList.innerHTML =
            "";


        (data || []).forEach(
            (
                player,
                index
            ) => {

                createPlayer(
                    player,
                    index
                );

            }
        );


    } catch (error) {

        console.error(
            "重新绘制排行榜异常：",
            error
        );

    }

}


// ============================================================
// 19. 打开评分弹窗
// ============================================================

function openRatingModal(
    playerId,
    playerName
) {

    selectedPlayerId =
        Number(playerId);


    ratingPlayerName.textContent =
        playerName;


    // 默认 5 分

    scoreRange.value =
        "5";

    scoreValue.textContent =
        "5";


    // 清空评论

    commentInput.value =
        "";

    updateCommentLength();


    submitRating.disabled =
        false;


    submitRating.innerHTML = `

        <span>
            ⭐
        </span>

        <span>
            提交评分
        </span>

    `;


    ratingModal.classList.add(
        "show"
    );


    setTimeout(
        () => {

            commentInput.focus();

        },
        150
    );

}


// ============================================================
// 20. 关闭弹窗
// ============================================================

function closeRatingModal() {

    ratingModal.classList.remove(
        "show"
    );


    selectedPlayerId =
        null;


    commentInput.value =
        "";


    updateCommentLength();

}


if (closeModal) {

    closeModal.addEventListener(
        "click",
        closeRatingModal
    );

}


// ============================================================
// 21. 点击背景关闭
// ============================================================

ratingModal.addEventListener(
    "click",
    function (event) {

        if (
            event.target ===
            ratingModal
        ) {

            closeRatingModal();

        }

    }
);


// ============================================================
// 22. ESC
// ============================================================

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key ===
            "Escape"
        ) {

            if (
                ratingModal.classList.contains(
                    "show"
                )
            ) {

                closeRatingModal();

            }

        }

    }
);


// ============================================================
// 23. 评分滑块
// ============================================================

scoreRange.addEventListener(
    "input",
    function () {

        let score =
            Number(
                scoreRange.value
            );


        score =
            Math.round(score);


        score =
            Math.max(
                0,
                Math.min(
                    5,
                    score
                )
            );


        scoreRange.value =
            score;


        scoreValue.textContent =
            score;

    }
);


// ============================================================
// 24. 评论字数
// ============================================================

commentInput.addEventListener(
    "input",
    updateCommentLength
);


// ============================================================
// 25. 更新字数
// ============================================================

function updateCommentLength() {

    if (!commentInput) {

        return;

    }


    const length =
        commentInput.value.length;


    commentLength.textContent =
        `${length} / 200`;


    if (
        length >= 200
    ) {

        commentLength.classList.add(
            "limit"
        );

    } else {

        commentLength.classList.remove(
            "limit"
        );

    }

}


// ============================================================
// 26. 判断是否为今天
//
// 使用浏览器本地日期。
// 如果你的服务器统一使用北京时间，后面可以改成
// Asia/Shanghai 的判断方式。
// ============================================================

function isToday(
    timestamp
) {

    if (!timestamp) {

        return false;

    }


    const date =
        new Date(
            timestamp
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return false;

    }


    const now =
        new Date();


    return (
        date.getFullYear() ===
        now.getFullYear()
        &&
        date.getMonth() ===
        now.getMonth()
        &&
        date.getDate() ===
        now.getDate()
    );

}


// ============================================================
// 27. 提交评分 + 评论
// ============================================================

submitRating.addEventListener(
    "click",
    async function () {

        // ====================================================
        // 检查球员
        // ====================================================

        if (
            selectedPlayerId ===
            null
        ) {

            alert(
                "请选择一名球员"
            );

            return;

        }


        // ====================================================
        // 获取评分
        // ====================================================

        const score =
            Number(
                scoreRange.value
            );


        // ====================================================
        // 获取评论
        // ====================================================

        const comment =
            commentInput.value.trim();


        // ====================================================
        // 评分验证
        // ====================================================

        if (
            !Number.isInteger(
                score
            ) ||
            score < 0 ||
            score > 5
        ) {

            alert(
                "评分必须是 0～5 的整数"
            );

            return;

        }


        // ====================================================
        // 评论验证
        //
        // 注意：
        // 评论为空现在允许提交。
        // ====================================================

        if (
            comment.length > 200
        ) {

            alert(
                "评论不能超过200字"
            );

            return;

        }


        // ====================================================
        // 不能评价自己
        // ====================================================

        if (
            Number(loginUser.id) ===
            Number(selectedPlayerId)
        ) {

            alert(
                "不能评价自己"
            );

            closeRatingModal();

            return;

        }


        // ====================================================
        // 禁用
        // ====================================================

        submitRating.disabled =
            true;


        submitRating.innerHTML = `

            <span>
                ⏳
            </span>

            <span>
                提交中...
            </span>

        `;


        try {

            // =================================================
            // 第一部分
            // 提交评分
            // =================================================

            console.log(
                "正在提交评分..."
            );


            const {
                data: ratingData,
                error: ratingError
            } =
                await supabaseClient
                    .rpc(
                        "rate_player",
                        {

                            rater:
                                Number(
                                    loginUser.id
                                ),

                            target:
                                Number(
                                    selectedPlayerId
                                ),

                            target_score:
                            score

                        }
                    );


            if (ratingError) {

                console.error(
                    "评分失败：",
                    ratingError
                );


                alert(
                    "评分失败：\n" +
                    ratingError.message
                );

                return;

            }


            console.log(
                "评分成功：",
                ratingData
            );


            // =================================================
            // 第二部分
            // 评论
            //
            // 如果评论为空：
            // 不操作 comments 表。
            //
            // 如果评论不为空：
            // 处理今天的评论。
            // =================================================

            if (
                comment.length > 0
            ) {

                console.log(
                    "开始处理评论..."
                );


                const commentResult =
                    await saveTodayComment(
                        Number(
                            selectedPlayerId
                        ),
                        Number(
                            loginUser.id
                        ),
                        comment
                    );


                if (
                    !commentResult.success
                ) {

                    console.error(
                        "评论保存失败：",
                        commentResult.error
                    );


                    alert(
                        "评分提交成功，但评论保存失败：\n" +
                        (
                            commentResult.error?.message ||
                            "未知错误"
                        )
                    );


                    closeRatingModal();

                    await loadRanking();

                    return;

                }

            }


            // =================================================
            // 成功
            // =================================================

            if (
                comment.length > 0
            ) {

                alert(
                    "评分和评论提交成功！"
                );

            } else {

                alert(
                    "评分提交成功！"
                );

            }


            closeRatingModal();


            await loadRanking();


        } catch (error) {

            console.error(
                "评分评论系统错误：",
                error
            );


            alert(
                "提交失败，请检查网络连接后重试"
            );


        } finally {

            submitRating.disabled =
                false;


            submitRating.innerHTML = `

                <span>
                    ⭐
                </span>

                <span>
                    提交评分
                </span>

            `;

        }

    }
);


// ============================================================
// 28. 保存今天的评论
//
// 规则：
//
// A. 今天没有评论
//    → INSERT
//
// B. 今天已经评论
//    → UPDATE 今天这条评论
//
// C. 昨天/以前有评论
//    → 不修改
//    → 今天重新 INSERT
//
// 注意：
// 这里故意没有使用 upsert，避免把历史评论覆盖掉。
// ============================================================

async function saveTodayComment(
    targetId,
    userId,
    content
) {

    try {

        // ====================================================
        // 获取该用户对该球员的评论
        // ====================================================

        let commentData = null;
        let commentError = null;

        if (comment.length > 0) {

            const result =
                await supabaseClient
                    .from("comments")
                    .upsert(
                        {
                            target_id:
                                Number(
                                    selectedPlayerId
                                ),

                            user_id:
                                Number(
                                    loginUser.id
                                ),

                            content:
                            comment
                        },
                        {
                            onConflict:
                                "user_id,target_id"
                        }
                    )
                    .select();

            commentData =
                result.data;

            commentError =
                result.error;


            if (commentError) {

                console.error(
                    "评论提交失败：",
                    commentError
                );

                alert(
                    "评分已经提交成功，但评论提交失败：\n" +
                    commentError.message
                );

                await loadRanking();

                return;

            }

        }


        // ====================================================
        // 查找今天的评论
        // ====================================================

        const todayComment =
            (
                existingComments || []
            ).find(
                comment =>
                    isToday(
                        comment.created_at
                    )
            );


        // ====================================================
        // 今天已经有评论
        // → UPDATE
        // ====================================================

        if (
            todayComment
        ) {

            console.log(
                "发现今天已有评论，准备覆盖：",
                todayComment.id
            );


            const {
                data,
                error
            } =
                await supabaseClient
                    .from("comments")
                    .update(
                        {
                            content:
                            content
                        }
                    )
                    .eq(
                        "id",
                        todayComment.id
                    )
                    .select();


            if (error) {

                console.error(
                    "覆盖今天评论失败：",
                    error
                );

                return {
                    success: false,
                    error: error
                };

            }


            console.log(
                "今天评论覆盖成功：",
                data
            );


            return {
                success: true,
                mode: "update",
                data: data
            };

        }


        // ====================================================
        // 今天没有评论
        // → INSERT
        // ====================================================

        console.log(
            "今天没有评论，创建新评论..."
        );


        const {
            data,
            error
        } =
            await supabaseClient
                .from("comments")
                .insert(
                    {

                        target_id:
                        targetId,

                        user_id:
                        userId,

                        content:
                        content

                    }
                )
                .select();


        if (error) {

            console.error(
                "创建评论失败：",
                error
            );


            return {
                success: false,
                error: error
            };

        }


        console.log(
            "新评论创建成功：",
            data
        );


        return {
            success: true,
            mode: "insert",
            data: data
        };


    } catch (error) {

        console.error(
            "保存评论异常：",
            error
        );


        return {
            success: false,
            error: error
        };

    }

}


// ============================================================
// 29. 刷新排行榜
// ============================================================

refreshButton.addEventListener(
    "click",
    async function () {

        await loadRanking();

    }
);


// ============================================================
// 30. 退出登录
// ============================================================

logoutButton.addEventListener(
    "click",
    function () {

        localStorage.removeItem(
            "loginUser"
        );


        window.location.href =
            "login.html";

    }
);


// ============================================================
// 31. 获取头像首字母
// ============================================================

function getInitial(
    name
) {

    if (!name) {

        return "?";

    }


    const text =
        String(name)
            .trim();


    if (
        text.length === 0
    ) {

        return "?";

    }


    return text
        .charAt(0)
        .toUpperCase();

}


// ============================================================
// 32. HTML 转义
// ============================================================

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text === null ||
        text === undefined
            ? ""
            : String(text);


    return div.innerHTML;

}


// ============================================================
// 33. 评论时间
// ============================================================

function formatCommentTime(
    timestamp
) {

    if (!timestamp) {

        return "";

    }


    const date =
        new Date(
            timestamp
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    const now =
        new Date();


    const diff =
        now.getTime() -
        date.getTime();


    if (
        diff < 60 * 1000
    ) {

        return "刚刚";

    }


    if (
        diff < 60 * 60 * 1000
    ) {

        return (
            Math.floor(
                diff /
                (60 * 1000)
            ) +
            "分钟前"
        );

    }


    if (
        diff < 24 * 60 * 60 * 1000
    ) {

        return (
            Math.floor(
                diff /
                (60 * 60 * 1000)
            ) +
            "小时前"
        );

    }


    return (
        date.getFullYear() +
        "-" +
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ) +
        "-" +
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )
    );

}


// ============================================================
// 34. 页面启动
// ============================================================

initializePage();
