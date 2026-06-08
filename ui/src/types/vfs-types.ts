import type { VfsType } from "../types";

export type FieldDef = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "password" | "number" | "textarea" | "select" | "path";
  options?: string[];
  required?: boolean;
  extra?: string;
  /** Optional group tag for custom rendering (e.g. "manual" fields hidden in scan mode) */
  group?: string;
};

export type SourceTypeDef = {
  type: VfsType;
  label: string;
  icon: string;
  dotColor: string;
  fields: FieldDef[];
};

export type CategoryDef = {
  key: string;
  label: string;
  icon: string;
  types: SourceTypeDef[];
};

// ── 来源分类 ──────────────────────────────────────────────────────

export const SOURCE_CATEGORIES: CategoryDef[] = [
  {
    key: "local",
    label: "本地存储",
    icon: "💾",
    types: [
      {
        type: "local",
        label: "本地文件",
        icon: "📁",
        dotColor: "bg-gray-500",
        fields: [
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/media",
            type: "path",
            extra: "本地磁盘路径",
            required: true,
          },
          {
            name: "show_hidden",
            label: "显示隐藏文件",
            type: "select",
            options: ["true", "false"],
            placeholder: "false",
          },
        ],
      },
    ],
  },
  {
    key: "local-network",
    label: "本地网络",
    icon: "🌐",
    types: [
      {
        type: "nfs",
        label: "NFS",
        icon: "🔵",
        dotColor: "bg-blue-500",
        fields: [
          {
            name: "host",
            label: "主机地址",
            placeholder: "nas.local",
            required: true,
          },
          {
            name: "exportPath",
            label: "导出路径",
            placeholder: "/data/media",
            required: true,
          },
          { name: "options", label: "挂载选项", placeholder: "ro,soft" },
        ],
      },
      {
        type: "smb",
        label: "SMB / CIFS",
        icon: "🔷",
        dotColor: "bg-cyan-500",
        fields: [
          {
            name: "host",
            label: "主机地址",
            placeholder: "192.168.1.100",
            required: true,
          },
          {
            name: "port",
            label: "端口",
            placeholder: "445",
            type: "number",
          },
          {
            name: "share",
            label: "共享名称",
            placeholder: "media, share, *",
          },
          {
            name: "domain",
            label: "域 / 工作组",
            placeholder: "WORKGROUP（可选）",
          },
          {
            name: "username",
            label: "用户名",
            placeholder: "guest",
          },
          {
            name: "password",
            label: "密码",
            placeholder: "密码",
            type: "password",
          },
        ],
      },
      {
        type: "webdav",
        label: "WebDAV",
        icon: "🟩",
        dotColor: "bg-green-500",
        fields: [
          {
            name: "url",
            label: "服务器地址",
            placeholder: "https://dav.example.com",
            required: true,
          },
          {
            name: "username",
            label: "用户名",
            placeholder: "admin",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            placeholder: "密码",
            type: "password",
            required: true,
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "vendor",
            label: "类型",
            type: "select",
            options: ["other", "sharepoint"],
            placeholder: "other",
          },
          {
            name: "tls",
            label: "跳过 TLS 验证",
            type: "select",
            options: ["false", "true"],
          },
        ],
      },
      {
        type: "ftp",
        label: "FTP",
        icon: "🟪",
        dotColor: "bg-purple-500",
        fields: [
          {
            name: "host",
            label: "主机地址",
            placeholder: "ftp.example.com",
            required: true,
          },
          {
            name: "port",
            label: "端口",
            placeholder: "21",
            type: "number",
          },
          {
            name: "username",
            label: "用户名",
            placeholder: "anonymous",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            placeholder: "密码",
            type: "password",
            required: true,
          },
          {
            name: "encoding",
            label: "编码",
            placeholder: "utf-8",
            extra: "如 utf-8 / gbk",
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
        ],
      },
      {
        type: "sftp",
        label: "SFTP",
        icon: "🔵",
        dotColor: "bg-indigo-500",
        fields: [
          {
            name: "host",
            label: "主机地址",
            placeholder: "ssh.example.com",
            required: true,
          },
          {
            name: "port",
            label: "端口",
            placeholder: "22",
            type: "number",
          },
          {
            name: "username",
            label: "用户名",
            placeholder: "root",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            placeholder: "密码",
            type: "password",
          },
          {
            name: "privateKey",
            label: "私钥 (PEM)",
            type: "textarea",
            placeholder: "-----BEGIN...",
            extra:
              "粘贴 ~/.ssh/id_rsa 文件内容，格式以 -----BEGIN ... PRIVATE KEY----- 开头；与密码二选一",
          },
          {
            name: "passphrase",
            label: "私钥口令",
            type: "password",
            placeholder: "私钥加密口令",
            extra: "若私钥创建时设置了保护口令则填写，否则留空",
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "ignore_symlink_error",
            label: "忽略符号链接错误",
            type: "select",
            options: ["false", "true"],
          },
        ],
      },
    ],
  },
  {
    key: "object-storage",
    label: "对象存储",
    icon: "☁️",
    types: [
      {
        type: "s3",
        label: "S3 兼容存储",
        icon: "🟡",
        dotColor: "bg-yellow-500",
        fields: [
          {
            name: "endpoint",
            label: "Endpoint",
            placeholder: "https://s3.amazonaws.com",
            required: true,
            extra: "支持 AWS S3 / 腾讯云 COS / 阿里云 OSS 等",
          },
          {
            name: "bucket",
            label: "Bucket 名称",
            placeholder: "tokimo",
            required: true,
          },
          {
            name: "access_key_id",
            label: "Access Key ID",
            placeholder: "AKIAIOSFODNN7EXAMPLE",
            required: true,
          },
          {
            name: "secret_access_key",
            label: "Secret Access Key",
            type: "password",
            placeholder: "wJalrXUtnFEMI/K7MDENG",
            required: true,
          },
          { name: "region", label: "Region", placeholder: "us-east-1" },
          {
            name: "session_token",
            label: "Session Token",
            type: "password",
            placeholder: "临时凭证 Token（可选）",
            extra: "使用 AWS STS 临时凭证时需填写；普通 IAM 长期密钥无需此字段",
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "custom_host",
            label: "自定义下载域名",
            placeholder: "cdn.example.com（CDN）",
          },
          {
            name: "list_object_version",
            label: "ListObject 版本",
            type: "select",
            options: ["v1", "v2"],
            placeholder: "v1",
          },
          {
            name: "force_path_style",
            label: "强制 Path Style",
            type: "select",
            options: ["false", "true"],
          },
        ],
      },
    ],
  },
  {
    key: "cn-cloud",
    label: "中国网盘",
    icon: "🇨🇳",
    types: [
      {
        type: "aliyundrive",
        label: "阿里云盘",
        icon: "🔶",
        dotColor: "bg-orange-400",
        fields: [
          {
            name: "refresh_token",
            label: "Refresh Token",
            type: "password",
            placeholder: "阿里云盘 Refresh Token",
            required: true,
            extra:
              "访问 api.oplist.org 按页面指引完成阿里云盘账号授权，取得 refresh_token 后填入此处",
          },
          {
            name: "root_folder_id",
            label: "根目录 ID",
            placeholder: "root",
            required: true,
          },
          {
            name: "order_by",
            label: "排序字段",
            type: "select",
            options: ["name", "size", "updated_at", "created_at"],
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["ASC", "DESC"],
          },
          {
            name: "rapid_upload",
            label: "秒传",
            type: "select",
            options: ["false", "true"],
          },
        ],
      },
      {
        type: "baidu_netdisk",
        label: "百度网盘",
        icon: "🔵",
        dotColor: "bg-blue-600",
        fields: [
          {
            name: "refresh_token",
            label: "Refresh Token",
            type: "password",
            placeholder: "百度网盘 Refresh Token",
            required: true,
            extra:
              "访问 api.oplist.org → 百度网盘 → 手动登录，完成授权后将「刷新令牌」填入此处，同时将页面上的 AppKey 填入下方 Client ID、SecretKey 填入 Client Secret",
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "order_by",
            label: "排序字段",
            type: "select",
            options: ["name", "time", "size"],
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["asc", "desc"],
          },
          {
            name: "client_id",
            label: "Client ID（AppKey）",
            placeholder: "api.oplist.org 页面上的 AppKey",
            required: true,
            extra:
              "授权完成后页面显示的「应用秘钥(AppKey)」，Token 与此绑定，必须填写，否则刷新报 sign is not matched",
          },
          {
            name: "client_secret",
            label: "Client Secret（SecretKey）",
            type: "password",
            placeholder: "api.oplist.org 页面上的 SecretKey",
            required: true,
            extra: "授权完成后页面显示的「访问秘钥(SecretKey)」",
          },
          {
            name: "download_api",
            label: "下载 API",
            type: "select",
            options: ["official", "crack", "crack_video"],
          },
        ],
      },
      {
        type: "quark",
        label: "夸克网盘",
        icon: "🟤",
        dotColor: "bg-amber-600",
        fields: [
          {
            name: "cookie",
            label: "Cookie",
            type: "textarea",
            placeholder: "夸克网盘 Cookie",
            required: true,
            extra:
              "浏览器登录 pan.quark.cn → F12 → Network → 任意请求 → Headers → 复制 Cookie 值",
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "0" },
          {
            name: "order_by",
            label: "排序字段",
            type: "select",
            options: ["none", "file_type", "file_name", "updated_at"],
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["asc", "desc"],
          },
          {
            name: "use_transcoding_address",
            label: "转码地址",
            type: "select",
            options: ["false", "true"],
            extra: "开启后可播放转码视频，支持 302 重定向",
          },
        ],
      },
      {
        type: "uc",
        label: "UC 网盘",
        icon: "🟤",
        dotColor: "bg-orange-600",
        fields: [
          {
            name: "cookie",
            label: "Cookie",
            type: "textarea",
            placeholder: "UC 网盘 Cookie",
            required: true,
            extra:
              "浏览器登录 drive.uc.cn → F12 → Network → 任意请求 → Headers → 复制 Cookie 值",
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "0" },
          {
            name: "order_by",
            label: "排序字段",
            type: "select",
            options: ["none", "file_type", "file_name", "updated_at"],
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["asc", "desc"],
          },
        ],
      },
      {
        type: "115cloud",
        label: "115网盘",
        icon: "🔴",
        dotColor: "bg-red-500",
        fields: [
          {
            name: "qrcode_source",
            label: "设备类型",
            type: "select",
            options: [
              "android",
              "ios",
              "tv",
              "web",
              "alipaymini",
              "wechatmini",
              "qandroid",
            ],
            extra:
              "不同设备类型的会话互相独立，建议选择与浏览器不同的类型以避免互踢下线",
            group: "device",
          },
          {
            name: "cookie",
            label: "Cookie",
            type: "textarea",
            placeholder: "UID=xxx;CID=xxx;SEID=xxx;KID=xxx",
            extra: "浏览器登录 115.com → F12 → Network → 复制请求头中 Cookie",
            group: "manual",
          },
          {
            name: "qrcode_token",
            label: "二维码 Token",
            type: "textarea",
            placeholder: "扫码登录后自动写入",
            extra: "扫码登录后自动填入，通常无需手动修改",
            group: "manual",
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "0" },
          {
            name: "page_size",
            label: "每页数量",
            type: "number",
            placeholder: "1000",
          },
        ],
      },
      {
        type: "123pan",
        label: "123云盘",
        icon: "🟢",
        dotColor: "bg-green-600",
        fields: [
          {
            name: "username",
            label: "用户名 / 手机号",
            placeholder: "登录账号",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "密码",
            required: true,
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "0" },
        ],
      },
      {
        type: "pikpak",
        label: "PikPak",
        icon: "🟡",
        dotColor: "bg-yellow-400",
        fields: [
          {
            name: "username",
            label: "用户名",
            placeholder: "邮箱 / 手机号",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "密码",
            required: true,
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "" },
          {
            name: "platform",
            label: "平台",
            type: "select",
            options: ["web", "android", "pc"],
          },
        ],
      },
      {
        type: "thunder",
        label: "迅雷",
        icon: "⚡",
        dotColor: "bg-blue-400",
        fields: [
          {
            name: "username",
            label: "用户名",
            placeholder: "手机号 / 邮箱",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "密码",
            required: true,
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "" },
          {
            name: "captcha_token",
            label: "验证码 Token",
            placeholder: "登录需要时填写",
            extra:
              "账号异常或首次登录时触发人机验证，从抓包或 App 中获取；通常留空",
          },
        ],
      },
      {
        type: "139yun",
        label: "中国移动云盘",
        icon: "🟢",
        dotColor: "bg-green-500",
        fields: [
          {
            name: "authorization",
            label: "Authorization 请求头",
            type: "textarea",
            placeholder: "Bearer eyJhbGciOiJ...",
            required: true,
            extra:
              "浏览器打开 yun.139.com → F12 → Network → 找任意 API 请求 → 复制请求头中 Authorization 的值",
          },
          {
            name: "username",
            label: "手机号",
            placeholder: "138xxxx",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "密码",
            required: true,
          },
          {
            name: "mail_cookies",
            label: "邮箱 Cookies",
            type: "textarea",
            placeholder: "来自 mail.139.com",
            extra:
              "登录 mail.139.com → F12 → Application → Cookies → 复制所有 cookie；用于身份验证",
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "" },
          {
            name: "type",
            label: "类型",
            type: "select",
            options: ["personal_new", "family", "group", "personal"],
          },
          {
            name: "cloud_id",
            label: "云盘 ID（家庭/群组）",
            placeholder: "cloud_id",
          },
        ],
      },
      {
        type: "189cloud",
        label: "天翼云盘",
        icon: "🔵",
        dotColor: "bg-sky-500",
        fields: [
          {
            name: "username",
            label: "用户名 / 手机号",
            placeholder: "登录账号",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "密码",
            required: true,
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "-11" },
          {
            name: "cookie",
            label: "Cookie（验证码场景）",
            type: "textarea",
            placeholder: "出现验证码时填写",
            extra:
              "正常登录无需填写；遇到滑动验证码时，从已登录的浏览器 F12 → Application → Cookies 中复制",
          },
        ],
      },
      {
        type: "mopan",
        label: "磨盘（移动）",
        icon: "🟢",
        dotColor: "bg-emerald-500",
        fields: [
          {
            name: "phone",
            label: "手机号",
            placeholder: "138xxxx",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "密码",
            required: true,
          },
          {
            name: "sms_code",
            label: "短信验证码",
            placeholder: "输入 send 触发发送",
            extra:
              "首次登录或安全验证时需要：先在此字段输入 send，保存后系统会向绑定手机发送验证码，再填入收到的6位数字",
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "" },
          { name: "cloud_id", label: "云盘 ID", placeholder: "" },
          {
            name: "order_by",
            label: "排序字段",
            type: "select",
            options: ["filename", "filesize", "lastOpTime"],
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["asc", "desc"],
          },
        ],
      },
      {
        type: "wopan",
        label: "联通云盘",
        icon: "🔴",
        dotColor: "bg-red-400",
        fields: [
          {
            name: "refresh_token",
            label: "Refresh Token",
            type: "password",
            placeholder: "联通云盘 Refresh Token",
            required: true,
            extra:
              "抓包联通云盘 App 或 Web 登录请求，从响应中获取 refresh_token 字段值",
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "0" },
          {
            name: "family_id",
            label: "家庭云盘 ID（可选）",
            placeholder: "留空使用个人云盘",
            extra: "需要访问家庭共享空间时填写；个人云盘留空即可",
          },
          {
            name: "sort_rule",
            label: "排序",
            type: "select",
            options: [
              "name_asc",
              "name_desc",
              "time_asc",
              "time_desc",
              "size_asc",
              "size_desc",
            ],
          },
        ],
      },
      {
        type: "lanzou",
        label: "蓝奏云",
        icon: "🔵",
        dotColor: "bg-blue-300",
        fields: [
          {
            name: "type",
            label: "登录方式",
            type: "select",
            options: ["cookie", "account", "url"],
            extra:
              "cookie：稳定但有效期约15天需定期更新；account：账号密码直接登录；url：直接访问分享链接",
          },
          {
            name: "cookie",
            label: "Cookie（约15天有效）",
            type: "textarea",
            placeholder: "type=cookie 时填写",
            extra:
              "浏览器登录蓝奏云 → F12 → Application → Cookies → 复制全部 cookie 字符串，有效期约15天",
          },
          {
            name: "account",
            label: "账号",
            placeholder: "type=account 时填写",
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "type=account 时填写",
          },
          { name: "root_folder_id", label: "根目录 ID", placeholder: "-1" },
          {
            name: "base_url",
            label: "文件操作 URL",
            placeholder: "https://pc.woozooo.com",
            required: true,
          },
          {
            name: "share_url",
            label: "分享页 URL",
            placeholder: "https://pan.lanzoui.com",
            required: true,
          },
        ],
      },
    ],
  },
  {
    key: "intl-cloud",
    label: "国际网盘",
    icon: "🌍",
    types: [
      {
        type: "google_drive",
        label: "Google Drive",
        icon: "🌈",
        dotColor: "bg-blue-500",
        fields: [
          {
            name: "refresh_token",
            label: "Refresh Token",
            type: "password",
            placeholder: "Google OAuth Refresh Token",
            required: true,
            extra:
              "OAuth 授权获取：在 Google Cloud Console 创建 OAuth 凭据，授权类型选「桌面应用」，完成同意屏幕后从返回结果中取 refresh_token；也可用 rclone config 流程获取",
          },
          {
            name: "root_folder_id",
            label: "根目录 ID",
            placeholder: "root",
            extra:
              "填 root 表示根目录，也可粘贴文件夹链接中的 ID（/folders/xxx 部分）",
          },
          {
            name: "client_id",
            label: "Client ID",
            placeholder: "自定义应用（可选）",
            extra:
              "在 Google Cloud Console 创建 OAuth 凭据后填写；留空使用公共配置",
          },
          {
            name: "client_secret",
            label: "Client Secret",
            type: "password",
            placeholder: "自定义应用（可选）",
          },
          {
            name: "order_by",
            label: "排序",
            placeholder: "folder,name,modifiedTime",
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["asc", "desc"],
          },
        ],
      },
      {
        type: "onedrive",
        label: "OneDrive",
        icon: "🔵",
        dotColor: "bg-sky-600",
        fields: [
          {
            name: "refresh_token",
            label: "Refresh Token",
            type: "password",
            placeholder: "OneDrive Refresh Token",
            required: true,
            extra:
              "OAuth 授权获取：在 Azure 应用注册中创建应用并授予 Files.ReadWrite.All 权限，通过授权码流完成登录后取 refresh_token；也可用 rclone config 流程获取",
          },
          {
            name: "region",
            label: "区域",
            type: "select",
            options: ["global", "cn", "us", "de"],
            required: true,
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "client_id",
            label: "Client ID",
            placeholder: "自定义应用（可选）",
          },
          {
            name: "client_secret",
            label: "Client Secret",
            type: "password",
            placeholder: "自定义应用（可选）",
          },
          {
            name: "redirect_uri",
            label: "Redirect URI",
            placeholder: "https://api.oplist.org/onedrive/callback",
          },
          {
            name: "is_sharepoint",
            label: "SharePoint",
            type: "select",
            options: ["false", "true"],
          },
          {
            name: "site_id",
            label: "Site ID（SharePoint）",
            placeholder: "",
            extra:
              "开启 SharePoint 后填写，格式：hostname,spsite-guid,web-guid",
          },
        ],
      },
      {
        type: "dropbox",
        label: "Dropbox",
        icon: "🔷",
        dotColor: "bg-blue-700",
        fields: [
          {
            name: "refresh_token",
            label: "Refresh Token",
            type: "password",
            placeholder: "Dropbox Refresh Token",
            required: true,
            extra:
              "OAuth 授权获取：在 dropbox.com/developers 创建 App（权限选 Full Dropbox），用授权码流完成登录后取 refresh_token；也可用 rclone config 流程获取",
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "client_id",
            label: "Client ID",
            placeholder: "自定义应用（可选）",
          },
          {
            name: "client_secret",
            label: "Client Secret",
            type: "password",
            placeholder: "自定义应用（可选）",
          },
        ],
      },
      {
        type: "mega",
        label: "Mega",
        icon: "🔴",
        dotColor: "bg-red-600",
        fields: [
          {
            name: "email",
            label: "邮箱",
            placeholder: "user@example.com",
            required: true,
          },
          {
            name: "password",
            label: "密码",
            type: "password",
            placeholder: "密码",
            required: true,
          },
          {
            name: "two_fa_secret",
            label: "2FA 密钥（TOTP）",
            type: "password",
            placeholder: "Base32 密钥，自动生成验证码",
            extra:
              "推荐填此字段：Mega 两步验证的 TOTP 密钥（Base32格式），系统会自动生成6位验证码",
          },
          {
            name: "two_fa_code",
            label: "2FA 验证码（临时）",
            placeholder: "6位数字，手动输入",
            extra:
              "手动输入当前6位验证码；单独填此字段不支持自动刷新，推荐改用上方 2FA 密钥",
          },
        ],
      },
      {
        type: "terabox",
        label: "Terabox",
        icon: "🟤",
        dotColor: "bg-amber-500",
        fields: [
          {
            name: "cookie",
            label: "Cookie",
            type: "textarea",
            placeholder: "Terabox Cookie",
            required: true,
            extra:
              "浏览器登录 terabox.com → F12 → Application → Cookies → 选中 terabox.com → 复制全部 cookie 字符串",
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "order_by",
            label: "排序字段",
            type: "select",
            options: ["name", "time", "size"],
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["asc", "desc"],
          },
        ],
      },
      {
        type: "yandex_disk",
        label: "Yandex Disk",
        icon: "🔴",
        dotColor: "bg-red-400",
        fields: [
          {
            name: "refresh_token",
            label: "Refresh Token",
            type: "password",
            placeholder: "Yandex OAuth Refresh Token",
            required: true,
            extra:
              "OAuth 授权获取：在 oauth.yandex.com 创建应用并授予 cloud_api:disk.read 权限，完成授权码流后取 refresh_token；也可用 rclone config 流程获取",
          },
          {
            name: "root_folder_path",
            label: "根目录",
            placeholder: "/",
            type: "path",
          },
          {
            name: "client_id",
            label: "Client ID",
            placeholder: "自定义应用（可选）",
          },
          {
            name: "client_secret",
            label: "Client Secret",
            type: "password",
            placeholder: "自定义应用（可选）",
          },
          {
            name: "order_by",
            label: "排序字段",
            type: "select",
            options: ["name", "path", "created", "modified", "size"],
          },
          {
            name: "order_direction",
            label: "排序方向",
            type: "select",
            options: ["asc", "desc"],
          },
        ],
      },
    ],
  },
];

// ── 扁平化映射（type → def）──────────────────────────────────────────

export const SOURCE_TYPE_MAP = new Map<VfsType, SourceTypeDef>(
  SOURCE_CATEGORIES.flatMap((c) => c.types.map((t) => [t.type, t])),
);

// ── 标签 / 颜色映射（兼容旧代码）────────────────────────────────────

export const sourceTypeLabels: Record<VfsType, string> = Object.fromEntries(
  SOURCE_CATEGORIES.flatMap((c) => c.types.map((t) => [t.type, t.label])),
) as Record<VfsType, string>;

export const sourceTypeColors: Record<VfsType, string> = {
  local: "gray",
  nfs: "blue",
  smb: "cyan",
  webdav: "green",
  ftp: "purple",
  sftp: "geekblue",
  s3: "gold",
  aliyundrive: "orange",
  baidu_netdisk: "blue",
  quark: "volcano",
  uc: "orange",
  "115cloud": "red",
  "123pan": "green",
  pikpak: "yellow",
  thunder: "blue",
  "139yun": "green",
  "189cloud": "cyan",
  mopan: "teal",
  wopan: "red",
  lanzou: "blue",
  google_drive: "blue",
  onedrive: "processing",
  dropbox: "blue",
  mega: "red",
  terabox: "gold",
  yandex_disk: "red",
};
