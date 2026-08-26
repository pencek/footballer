// ============================================================
// Footballer - 球员排行榜
// Player Ranking Platform
// ============================================================


// ============================================================
// 1. 登录状态
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

    localStorage.removeItem("loginUser");

    window.location.href =
        "login.html";

    throw new Error("登录信息错误");

}


// ============================================================
// 2. 检查 Supabase
// ============================================================

if (
    typeof supabaseClient === "undefined"
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


const emptyState =
    document.getElementById(
        "emptyState"
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
// 5. 当前选择的球员
// ============================================================

let selectedPlayerId = null;


// ============================================================
// 6. 数据缓存
// ============================================================

let rankingData = [];

let commentsByPlayer = {};

let userNameMap = {};


// ============================================================
// 7. 评论展开状态
// ============================================================

const expandedComments =
    new Set();


// ============================================================
// 8. 防止重复提交
// ============================================================

let submittingRating = false;


// ============================================================
// 9. 显示当前用户
// ============================================================

function initializeUser() {

    const userName =
        loginUser.name ||
        loginUser.username ||
        "用户";


    currentUserName.textContent =
        userName;


    currentUserAvatar.textContent =
        getInitial(userName);

}


// ============================================================
// 10. 初始化页面
// ============================================================

async function initializePage() {

    console.log(
        "Footballer 页面初始化..."
    );


    initializeUser();


    await loadRanking();

}


// ============================================================
// 11. 加载排行榜
// ============================================================

async function loadRanking() {

    console.log(
        "开始加载排行榜..."
    );


    setLoading(true);


    refreshButton.disabled =
        true;


    emptyState.style.display =
        "none";


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
                "排行榜加载失败：",
                error
            );

            showLoadError(
                error.message
            );

            return;

        }


        rankingData =
            Array.isArray(data)
                ? data
                : [];


        console.log(
            "排行榜数据：",
            rankingData
        );


        // ====================================================
        // 加载评论
        // ====================================================

        await loadComments();


        // ====================================================
        // 更新数量
        // ====================================================

        playerCount.textContent =
            rankingData.length;


        // ====================================================
        // 空状态
        // ====================================================

        if (
            rankingData.length === 0
        ) {

            rankingList.innerHTML =
                "";

            emptyState.style.display =
                "block";

            return;

        }


        // ====================================================
        // 创建排行榜
        // ====================================================

        renderRanking();


    } catch (error) {

        console.error(
            "排行榜系统异常：",
            error
        );


        showLoadError(
            "网络连接失败，请稍后再试"
        );


    } finally {

        setLoading(false);

        refreshButton.disabled =
            false;

    }

}


// ============================================================
// 12. 设置加载状态
// ============================================================

function setLoading(isLoading) {

    if (isLoading) {

        loading.style.display =
            "flex";

        loading.innerHTML = `

            <div class="loading-spinner"></div>

            <p>
                正在加载球员数据...
            </p>

            <span>
                CONNECTING TO SERVER
            </span>

        `;

        rankingList.innerHTML =
            "";

    } else {

        loading.style.display =
            "none";

    }

}


// ============================================================
// 13. 加载错误
// ============================================================

function showLoadError(
    message
) {

    loading.style.display =
        "flex";


    loading.innerHTML = `

        <div style="
            font-size:32px;
            margin-bottom:15px;
        ">
            ⚠️
        </div>

        <p style="
            color:#ff7373;
        ">
            排行榜加载失败
        </p>

        <span style="
            max-width:420px;
            text-align:center;
            line-height:1.6;
        ">
            ${escapeHTML(message)}
        </span>

    `;

}


// ============================================================
// 14. 加载评论
// ============================================================

async function loadComments() {

    commentsByPlayer = {};

    userNameMap = {};


    try {

        const {
            data: comments,
            error
        } =
            await supabaseClient
                .from("comments")
                .select(`
                    id,
                    target_id,
                    user_id,
                    content,
                    created_at
                `)
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "评论加载失败：",
                error
            );

            return;

        }


        const commentList =
            comments || [];


        // ====================================================
        // 加载评论作者
        // ====================================================

        await loadCommentUserNames(
            commentList
        );


        // ====================================================
        // 按球员分类
        // ====================================================

        commentList.forEach(
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
                    ].push(comment);

            }
        );


    } catch (error) {

        console.error(
            "评论系统错误：",
            error
        );

        commentsByPlayer = {};

    }

}


// ============================================================
// 15. 加载评论作者
// ============================================================

async function loadCommentUserNames(
    comments
) {

    if (
        !comments ||
        comments.length === 0
    ) {

        return;

    }


    const userIds =
        [
            ...new Set(
                comments
                    .map(
                        comment =>
                            Number(
                                comment.user_id
                            )
                    )
                    .filter(
                        id =>
                            Number.isFinite(id)
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
            "评论作者异常：",
            error
        );

    }

}


// ============================================================
// 16. 渲染排行榜
// ============================================================

function renderRanking() {

    rankingList.innerHTML =
        "";


    rankingData.forEach(
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

}


// ============================================================
// 17. 创建球员
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


    const playerName =
        player.name ||
        "未知球员";


    const username =
        player.username ||
        "unknown";


    // ========================================================
    // 是否本人
    // ========================================================

    const isSelf =
        playerId ===
        Number(loginUser.id);


    // ========================================================
    // 评分人数
    // ========================================================

    const ratingCount =
        Number(
            player.rating_count || 0
        );


    // ========================================================
    // 平均评分
    // ========================================================

    const averageScore =
        player.average_score === null ||
        player.average_score === undefined
            ? null
            : Number(
                player.average_score
            );


    // ========================================================
    // 分数
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
                    data-player-id="${playerId}">

                ⭐ 给 TA 评分

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
                    ${getInitial(playerName)}
                </div>

                <div>

                    <div class="player-name">
                        ${escapeHTML(playerName)}
                    </div>

                    <div class="player-account">
                        @${escapeHTML(username)}
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
                () => {

                    openRatingModal(
                        playerId,
                        playerName
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
            () => {

                toggleComments(
                    playerId
                );

            }
        );

    }

}


// ============================================================
// 18. 评论区域
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


    // ========================================================
    // 当前显示的评论
    // ========================================================

    const displayComments =
        isExpanded
            ? comments
            : comments.slice(0, 1);


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


    // ========================================================
    // 查看全部
    // ========================================================

    let showButtonHTML =
        "";


    if (
        comments.length > 1
    ) {

        showButtonHTML = `

            <button
                    type="button"
                    class="show-comments-button">

                ${
            isExpanded
                ? "收起评论"
                : `查看全部 ${comments.length} 条评论`
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
                    ${comments.length} 条评论
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
// 19. 单条评论
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

                        ${escapeHTML(userName)}

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
// 20. 展开 / 收起评论
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


    // 不重新请求数据库
    // 直接使用已有 rankingData
    renderRanking();

}


// ============================================================
// 21. 打开评分弹窗
// ============================================================

function openRatingModal(
    playerId,
    playerName
) {

    if (
        Number(playerId) ===
        Number(loginUser.id)
    ) {

        alert(
            "不能评价自己"
        );

        return;

    }


    selectedPlayerId =
        Number(playerId);


    ratingPlayerName.textContent =
        playerName;


    // 默认 5 分

    scoreRange.value =
        "5";

    scoreValue.textContent =
        "5";


    updateRangeBackground();


    // 清空评论

    commentInput.value =
        "";

    updateCommentLength();


    // 恢复按钮

    submittingRating =
        false;

    setSubmitButton(
        false
    );


    // 显示弹窗

    ratingModal.classList.add(
        "show"
    );


    document.body.style.overflow =
        "hidden";


    // 自动聚焦

    setTimeout(
        () => {

            if (
                commentInput
            ) {

                commentInput.focus();

            }

        },
        180
    );

}


// ============================================================
// 22. 关闭弹窗
// ============================================================

function closeRatingModal() {

    ratingModal.classList.remove(
        "show"
    );


    document.body.style.overflow =
        "";


    selectedPlayerId =
        null;


    commentInput.value =
        "";

    updateCommentLength();

}


// ============================================================
// 23. 关闭按钮
// ============================================================

closeModal.addEventListener(
    "click",
    closeRatingModal
);


// ============================================================
// 24. 点击遮罩关闭
// ============================================================

ratingModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            ratingModal
        ) {

            closeRatingModal();

        }

    }
);


// ============================================================
// 25. ESC
// ============================================================

document.addEventListener(
    "keydown",
    event => {

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
// 26. 评分滑块
// ============================================================

scoreRange.addEventListener(
    "input",
    () => {

        let score =
            Number(
                scoreRange.value
            );


        if (
            score < 1
        ) {

            score = 1;

        }


        if (
            score > 5
        ) {

            score = 5;

        }


        score =
            Math.round(score);


        scoreRange.value =
            score;


        scoreValue.textContent =
            score;


        updateRangeBackground();

    }
);


// ============================================================
// 27. 更新滑块背景
// ============================================================

function updateRangeBackground() {

    const min = 1;

    const max = 5;

    const value =
        Number(
            scoreRange.value
        );


    const percentage =
        (
            (value - min) /
            (max - min)
        ) * 100;


    scoreRange.style.background =
        `linear-gradient(
            to right,
            #2bea70 0%,
            #2bea70 ${percentage}%,
            rgba(255,255,255,.08) ${percentage}%,
            rgba(255,255,255,.08) 100%
        )`;

}


// ============================================================
// 28. 评论字数
// ============================================================

commentInput.addEventListener(
    "input",
    updateCommentLength
);


function updateCommentLength() {

    const length =
        commentInput.value.length;


    commentLength.textContent =
        `${length} / 200`;


    if (
        length >= 180
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
// 29. 提交按钮状态
// ============================================================

function setSubmitButton(
    loadingState
) {

    submitRating.disabled =
        loadingState;


    if (loadingState) {

        submitRating.innerHTML = `

            <span>
                ⏳
            </span>

            <span>
                正在提交...
            </span>

        `;

    } else {

        submitRating.innerHTML = `

            <span>
                ⭐
            </span>

            <span>
                提交评分与评论
            </span>

        `;

    }

}


// ============================================================
// 30. 提交评分 + 评论
// ============================================================

submitRating.addEventListener(
    "click",
    submitRatingAndComment
);


async function submitRatingAndComment() {

    // 防重复点击

    if (
        submittingRating
    ) {

        return;

    }


    // ========================================================
    // 检查目标
    // ========================================================

    if (
        selectedPlayerId === null
    ) {

        alert(
            "请选择一名球员"
        );

        return;

    }


    // ========================================================
    // 评分
    // ========================================================

    const score =
        Number(
            scoreRange.value
        );


    if (
        !Number.isInteger(score) ||
        score < 1 ||
        score > 5
    ) {

        alert(
            "评分必须是 1～5 的整数"
        );

        return;

    }


    // ========================================================
    // 评论
    // ========================================================

    const comment =
        commentInput.value.trim();


    if (
        comment.length === 0
    ) {

        alert(
            "请输入对这名球员的评价"
        );

        commentInput.focus();

        return;

    }


    if (
        comment.length > 200
    ) {

        alert(
            "评论不能超过 200 字"
        );

        return;

    }


    // ========================================================
    // 不能评价自己
    // ========================================================

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


    // ========================================================
    // 开始提交
    // ========================================================

    submittingRating =
        true;


    setSubmitButton(
        true
    );


    try {

        console.log(
            "提交评分：",
            {
                rater:
                    Number(loginUser.id),

                target:
                    Number(selectedPlayerId),

                score:
                score
            }
        );


        // ====================================================
        // 第一步：评分
        // ====================================================

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


        // ====================================================
        // 第二步：评论
        // ====================================================

        const {
            data: commentData,
            error: commentError
        } =
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


        if (commentError) {

            console.error(
                "评论提交失败：",
                commentError
            );


            alert(
                "评分已经成功提交，但评论提交失败：\n" +
                commentError.message
            );


            closeRatingModal();

            await loadRanking();

            return;

        }


        console.log(
            "评论成功：",
            commentData
        );


        // ====================================================
        // 成功
        // ====================================================

        alert(
            "评分和评论提交成功！"
        );


        closeRatingModal();


        // ====================================================
        // 刷新数据
        // ====================================================

        await loadRanking();


    } catch (error) {

        console.error(
            "评分评论系统异常：",
            error
        );


        alert(
            "提交失败，请检查网络连接后重试"
        );


    } finally {

        submittingRating =
            false;

        setSubmitButton(
            false
        );

    }

}


// ============================================================
// 31. 刷新排行榜
// ============================================================

refreshButton.addEventListener(
    "click",
    async () => {

        await loadRanking();

    }
);


// ============================================================
// 32. 退出登录
// ============================================================

logoutButton.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                "确定要退出登录吗？"
            );


        if (!confirmed) {

            return;

        }


        localStorage.removeItem(
            "loginUser"
        );


        window.location.href =
            "login.html";

    }
);


// ============================================================
// 33. 获取头像首字母
// ============================================================

function getInitial(
    name
) {

    if (
        !name
    ) {

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
// 34. HTML 转义
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
// 35. 评论时间
// ============================================================

function formatCommentTime(
    timestamp
) {

    if (
        !timestamp
    ) {

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


    // 未来时间

    if (
        diff < 0
    ) {

        return "刚刚";

    }


    // 一分钟

    if (
        diff < 60 * 1000
    ) {

        return "刚刚";

    }


    // 一小时

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


    // 一天

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


    // 三十天以内

    if (
        diff < 30 * 24 * 60 * 60 * 1000
    ) {

        return (
            Math.floor(
                diff /
                (24 * 60 * 60 * 1000)
            ) +
            "天前"
        );

    }


    // 日期

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
// 36. 页面启动
// ============================================================

initializePage();