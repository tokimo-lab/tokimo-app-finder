use sea_orm::*;
use uuid::Uuid;

use crate::AppError;
use crate::db::entities::file_favorites;

pub struct FileFavoriteRepo;

impl FileFavoriteRepo {
    pub async fn list(
        db: &DatabaseConnection,
        user_id: Uuid,
    ) -> Result<Vec<file_favorites::Model>, AppError> {
        file_favorites::Entity::find()
            .filter(file_favorites::Column::UserId.eq(user_id))
            .order_by_asc(file_favorites::Column::CreatedAt)
            .all(db)
            .await
            .map_err(AppError::Database)
    }

    /// Returns `true` if the item was added, `false` if it was removed.
    pub async fn toggle(
        db: &DatabaseConnection,
        user_id: Uuid,
        vfs_id: Uuid,
        path: String,
        name: String,
        is_directory: bool,
    ) -> Result<bool, AppError> {
        let existing = file_favorites::Entity::find()
            .filter(file_favorites::Column::UserId.eq(user_id))
            .filter(file_favorites::Column::VfsId.eq(vfs_id))
            .filter(file_favorites::Column::Path.eq(&path))
            .one(db)
            .await
            .map_err(AppError::Database)?;

        if let Some(row) = existing {
            file_favorites::Entity::delete_by_id(row.id)
                .exec(db)
                .await
                .map_err(AppError::Database)?;
            Ok(false)
        } else {
            let now: chrono::DateTime<chrono::FixedOffset> = chrono::Utc::now().into();
            let model = file_favorites::ActiveModel {
                id: Set(Uuid::new_v4()),
                user_id: Set(user_id),
                vfs_id: Set(vfs_id),
                path: Set(path),
                name: Set(name),
                is_directory: Set(is_directory),
                created_at: Set(now),
            };
            file_favorites::Entity::insert(model)
                .exec(db)
                .await
                .map_err(AppError::Database)?;
            Ok(true)
        }
    }
}
