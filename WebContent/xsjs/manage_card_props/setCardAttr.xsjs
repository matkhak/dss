/**
 ******************************************************
 * Создание / изменение / удаление атрибутов карточки *
 ******************************************************
 *
 * @param POST - для создания атрибутов
 * Принимает параметры:
 *      id      - id карточки
 *      version - версия карточки
 *      name    - название атрибута
 *      desc    - описание атрибута
 *
 * @param PUT - для изменения атрибутов
 * Меняется название, описание, и маппинг
 * Принимает параметры:
 *      idAttr  - id атрибута
 *      newName - новое название атрибута
 *      desc    - новое описание атрибута
 *
 * @param DEL - для удаления атрибутов
 * Принимает параметры:
 *      attrID      - id атрибута
 *
 * @return В случае успеха возвращается статус 200
 *
 * @return В случае ошибки возвращается статус 500 и текст:
 *      nameIsEmpty    - Название пустое
 *      descIsEmpty    - Описание пустое
 *      ATTR_ALREADY_EXIST - попытка создания дубликата
 *
 * @author Talipov_MI@surgutneftegas.ru
 *
 */

/**
 * Основа
 */
try {
    var conn = $.db.getConnection();
    var id = parseInt($.request.parameters.get("id"));
    var version = parseInt($.request.parameters.get("version"));
    var isLoadFromFile = parseInt($.request.parameters.get("isLoadFromFile"));

    switch ($.request.method) {
        case $.net.http.POST: // создание
            post();
            break;
        case $.net.http.PUT: // изменение
            put();
            break;
        case $.net.http.DEL: // удаление
            del();
            break;
    }
    $.response.status = $.net.http.OK;

} catch (e) {
    // 301 Unique constraint violated - при попытке создать дубликат
    if (e.code === 301) {
        $.response.setBody("ATTR_ALREADY_EXIST");
    } else {
        $.response.setBody(e.toString());
    }
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

// создание
function post() {

    switch (isLoadFromFile) {
        case 0: // единичное добавление
            var desc;
            var name;
            if ($.request.parameters.get("desc")) {
                desc = $.request.parameters.get("desc").toString().trim();
            }
            if ($.request.parameters.get("name")) {
                name = $.request.parameters.get("name").toString().trim();
            }

            if (!desc) {
                throw "descIsEmpty";
            }

            var pstmt = conn.prepareStatement("insert into Z_BOBJ_REPO.T_ATTRIBUTE " +
                "(id_card, version,id_attribute,name, id_global_analytic,DESCRIPTION, EDIT_DATE, author) " +
                "values (?, ?,Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL, ?, null,?, current_timestamp, current_user)");
            pstmt.setInteger(1, id);
            pstmt.setInteger(2, version);
            pstmt.setString(3, name);
            pstmt.setString(4, desc);
            pstmt.execute();

            break;
        case 1: // загрузка из файла

            var aAttrs = JSON.parse($.request.parameters.get("data").toString());
            var pstmt = conn.prepareStatement("insert into Z_BOBJ_REPO.T_ATTRIBUTE " +
                "(id_card, version,id_attribute,name, id_global_analytic,DESCRIPTION, EDIT_DATE, author) " +
                "values (?, ?,Z_BOBJ_REPO.SQ_T_ATTRIBUTE.NEXTVAL, ?, null,?, current_timestamp, current_user)");
            pstmt.setBatchSize(aAttrs.length);

            for (var i = 0; i < aAttrs.length; i++) {
                pstmt.setInteger(1, id);
                pstmt.setInteger(2, version);
                pstmt.setString(3, aAttrs[i].attrName);
                pstmt.setString(4, aAttrs[i].attrDesc);
                pstmt.addBatch();

            }
            pstmt.executeBatch();

            break;
    }

    conn.commit();
}

/**
 * Изменение атрибута.
 *
 * Если изменяется имя атрибута, то
 * кроме смены названия и описания, еще нужно изменить соответствующие записи в таблице маппинга
 */
function put()
{
    // var oldName = $.request.parameters.get("oldName").toString().trim();
    let desc = $.request.parameters.get("desc").toString().trim();
    let newName = $.request.parameters.get("newName").toString().trim();
    let idAttr = parseInt($.request.parameters.get("idAttr"));

    // обновляем таблицу атрибутов
    var pstmt = conn.prepareStatement(
        "update Z_BOBJ_REPO.T_ATTRIBUTE " +
        "SET name = ?, " +
        "DESCRIPTION = ?, " +
        "edit_date = current_timestamp, " +
        "author = current_user " +
        "WHERE id_attribute = ?"
    );
    pstmt.setString(1, newName);
    pstmt.setString(2, desc);
    pstmt.setBigInt(3, idAttr);
    //pstmt.setInteger(4, version);
    //pstmt.setString(5, oldName);
    pstmt.execute();


    // при необходимости обновляем таблицу мапинга
    // if (oldName !== newName) {
    //     pstmt = conn.prepareStatement(
    //         "update Z_BOBJ_REPO.T_MAPPED_ATTRS " +
    //         "SET attribute = ? " +
    //         "WHERE id_card = ? " +
    //         "AND version = ? " +
    //         "AND attribute = ?"
    //     );
    //     pstmt.setString(1, newName);
    //     pstmt.setInteger(2, id);
    //     pstmt.setInteger(3, version);
    //     pstmt.setString(4, oldName);
    //     pstmt.execute();
    // }

    conn.commit();
}

// удаление атрибута и всех его маппингов
function del()
{
    let iAttrID = parseInt($.request.parameters.get("attrID"));

    // // удаляем справочники
    // let pstmt = conn.prepareStatement(
    // 	"delete " +
    // 	"from Z_BOBJ_REPO.T_MAPPING_DICTIONARY " +
    // 	"where ID_MAPPING in (" +
    // 	"   select ID_MAPPING " +
    // 	"   from Z_BOBJ_REPO.T_MAPPING_ATTRIBUTE " +
    // 	"   where ID_ATTRIBUTE = ? " +
    // 	")"
    // );
    // pstmt.setBigInt(1, iAttrID);
    // pstmt.execute();

    // удаляем маппинг
    let pstmt = conn.prepareStatement(
        "delete " +
        "from Z_BOBJ_REPO.T_MAPPING_ATTRIBUTE " +
        "where ID_ATTRIBUTE = ? "
    );
    pstmt.setBigInt(1, iAttrID);
    pstmt.execute();

    // удаляем сам атрибут
    pstmt = conn.prepareStatement(
        "delete " +
        "from Z_BOBJ_REPO.T_ATTRIBUTE " +
        "where ID_ATTRIBUTE = ? "
    );
    pstmt.setBigInt(1, iAttrID);
    pstmt.execute();

    conn.commit();
}
