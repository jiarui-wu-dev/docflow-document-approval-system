CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,
                       username VARCHAR(100) NOT NULL UNIQUE,
                       email VARCHAR(255) NOT NULL UNIQUE,
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(30) NOT NULL,
                       created_at TIMESTAMP NOT NULL,
                       updated_at TIMESTAMP NOT NULL
);

CREATE TABLE documents (
                           id BIGSERIAL PRIMARY KEY,
                           title VARCHAR(200) NOT NULL,
                           description VARCHAR(2000),
                           status VARCHAR(30) NOT NULL,
                           submitter_id BIGINT NOT NULL REFERENCES users(id),
                           reviewer_id BIGINT REFERENCES users(id),
                           created_at TIMESTAMP NOT NULL,
                           updated_at TIMESTAMP NOT NULL
);

CREATE TABLE review_comments (
                                 id BIGSERIAL PRIMARY KEY,
                                 document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                                 reviewer_id BIGINT NOT NULL REFERENCES users(id),
                                 content VARCHAR(2000) NOT NULL,
                                 created_at TIMESTAMP NOT NULL
);

CREATE TABLE approval_history (
                                  id BIGSERIAL PRIMARY KEY,
                                  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                                  changed_by BIGINT NOT NULL REFERENCES users(id),
                                  old_status VARCHAR(30),
                                  new_status VARCHAR(30) NOT NULL,
                                  remark VARCHAR(1000),
                                  created_at TIMESTAMP NOT NULL
);